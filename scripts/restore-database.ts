import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurations
const DB_TEST_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

const DB_PROD_CONFIG = {
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.lveqqmkyludigtgfqmwl',
  password: 'W3VwHQEMtSDDgY3V',
  ssl: { rejectUnauthorized: false },
};

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function selectEnvironment(rl: readline.Interface) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         SÉLECTION DE L\'ENVIRONNEMENT                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log('   1. 🧪 TEST / QUALIFICATION (eu-west-1)');
  console.log('   2. 🟢 PRODUCTION (us-east-1)\n');

  const answer = await askQuestion(rl, 'Choisissez un environnement (1 ou 2): ');

  if (answer === '2') {
    console.log('\n✅ Environnement: PRODUCTION\n');
    return { config: DB_PROD_CONFIG, name: 'PRODUCTION' };
  }
  console.log('\n✅ Environnement: TEST / QUALIFICATION\n');
  return { config: DB_TEST_CONFIG, name: 'TEST' };
}

/**
 * Parse SQL content into individual statements
 * Gère les blocs complexes (CREATE FUNCTION, TRIGGER, etc.)
 */
function parseSQLStatements(sqlContent: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let inBlockComment = false;
  let i = 0;

  while (i < sqlContent.length) {
    const char = sqlContent[i];
    const next = sqlContent[i + 1] || '';

    // Gestion des commentaires imbriqués
    if (!inSingleQuote && !inDollarQuote && !inBlockComment) {
      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (char === '-' && next === '-') {
        while (i < sqlContent.length && sqlContent[i] !== '\n') i++;
        continue;
      }
    }

    // Gestion des commentaires imbriqués
    if (inBlockComment && char === '*' && next === '/') {
      inBlockComment = false;
      i += 2;
      continue;
    }
    if (inBlockComment) {
      i++;
      continue;
    }

    // Check for dollar quote start
    if (char === '$' && !inSingleQuote && !inDollarQuote) {
      let tagEnd = i + 1;
      while (tagEnd < sqlContent.length && /[\w_]/.test(sqlContent[tagEnd])) tagEnd++;
      if (sqlContent[tagEnd] === '$') {
        dollarTag = sqlContent.substring(i, tagEnd + 1);
        inDollarQuote = true;
        current += dollarTag;
        i = tagEnd + 1;
        continue;
      }
    }

    // Check for dollar quote end
    if (inDollarQuote && sqlContent.substring(i).startsWith(dollarTag)) {
      current += dollarTag;
      i += dollarTag.length;
      inDollarQuote = false;
      dollarTag = '';
      continue;
    }

    // Toggle single quote
    if (char === "'" && !inDollarQuote) {
      inSingleQuote = !inSingleQuote;
    }

    // Statement separator - but be careful with functions and views
    if (char === ';' && !inSingleQuote && !inDollarQuote) {
      if (current.trim()) {
        // Check if this ends a function or view
        const trimmed = current.trim().toUpperCase();
        if (trimmed.endsWith('$$') || trimmed.endsWith('LANGUAGE SQL') || trimmed.endsWith('LANGUAGE PLPGSQL')) {
          // Still in function
        } else if (trimmed.includes('CREATE VIEW') && !trimmed.includes('CREATE MATERIALIZED')) {
          // Still in view
        } else {
          statements.push(current.trim());
        }
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function restoreDatabase(backupFile?: string) {
  const rl = createInterface();

  try {
    const { config: dbConfig, name: envName } = await selectEnvironment(rl);

    let backupPath = backupFile;

    if (!backupPath) {
      const backupDir = path.join(__dirname, '..', 'database backup');

      console.log('📁 Fichiers de backup disponibles:\n');

      if (!fs.existsSync(backupDir)) {
        console.log('   ⚠️  Aucun dossier de backup trouvé.\n');
        return;
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
        .sort().reverse();

      if (files.length === 0) {
        console.log('   ⚠️  Aucun fichier de backup trouvé.\n');
        return;
      }

      const envFiles = files.filter(f => f.includes(envName === 'PRODUCTION' ? 'PROD' : 'TEST'));
      const displayFiles = envFiles.length > 0 ? envFiles : files;

      console.log('   ┌─────────────────────────────────────────────────────────┐');
      displayFiles.forEach((file, idx) => {
        const size = (fs.statSync(path.join(backupDir, file)).size / 1024 / 1024).toFixed(2);
        const env = file.includes('PROD') ? '🟢 PROD' : file.includes('TEST') ? '🧪 TEST' : '❓';
        console.log(`   │ ${idx + 1}. ${file} (${size} MB) [${env}]`);
      });
      console.log('   └─────────────────────────────────────────────────────────┘\n');

      const answer = await askQuestion(rl, 'Choisissez un fichier (numéro ou nom complet): ');
      if (!answer) { console.log('❌ Annulé.\n'); return; }

      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < displayFiles.length) {
        backupPath = path.join(backupDir, displayFiles[idx]);
      } else if (fs.existsSync(path.join(backupDir, answer))) {
        backupPath = path.join(backupDir, answer);
      } else {
        console.log(`❌ Fichier non trouvé: ${answer}\n`);
        return;
      }
    }

    if (!fs.existsSync(backupPath)) {
      console.log(`❌ Fichier non trouvé: ${backupPath}\n`);
      return;
    }

    const fileSize = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);

    console.log('\n' + '═'.repeat(80));
    console.log('🔄 RESTAURATION DE LA BASE DE DONNÉES');
    console.log('═'.repeat(80));
    console.log(`\n🌍 Environnement: ${envName}`);
    console.log(`📁 Fichier: ${backupPath}`);
    console.log(`📊 Taille: ${fileSize} MB\n`);

    const warningMsg = envName === 'PRODUCTION'
      ? '⚠️  ATTENTION: PRODUCTION - Cette opération est CRITIQUE!'
      : '⚠️  ATTENTION: Cette opération va SUPPRIMER et recréer TOUS les objets!';

    const confirm = await askQuestion(
      rl,
      `${warningMsg}\n   (Vues, Fonctions, Triggers, Tables, Données)\n\n   Êtes-vous SÛR de vouloir continuer? (tapez "OUI" pour confirmer): `
    );

    if (confirm.toUpperCase() !== 'OUI') {
      console.log('\n❌ Restauration annulée.\n');
      return;
    }

    console.log('\n🔌 Connexion à la base de données...\n');
    const client = new Client(dbConfig);

    // Vérifier la connexion avant de commencer
    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log('✅ Connexion vérifiée');
    } catch (error: any) {
      console.error('❌ Connexion échouée:', error.message);
      throw error;
    }

    console.log('📖 Lecture du fichier...\n');
    const sqlContent = fs.readFileSync(backupPath, 'utf-8');

    console.log('⚙️  Analyse des statements...\n');
    const statements = parseSQLStatements(sqlContent);
    console.log(`   📊 ${statements.length} statements trouvés\n`);

    // Afficher un aperçu des premiers statements pour le diagnostic
    console.log('🔍 Aperçu des premiers statements:');
    statements.slice(0, 5).forEach((stmt, idx) => {
      const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   ${idx + 1}. ${preview}...`);
    });
    if (statements.length > 5) {
      console.log(`   ... et ${statements.length - 5} autres statements`);
    }
    console.log();

    console.log('⚙️  Exécution...\n');

    let executed = 0, errors = 0, warnings = 0;
    const errorCodes = new Map<string, number>();
    const sectionStats = {
      types: 0,
      tables: 0,
      views: 0,
      functions: 0,
      triggers: 0,
      data: 0,
      sequences: 0,
    };

    let currentSection = 'types';
    const startTime = Date.now();

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const stmtUpper = stmt.toUpperCase();

      // Track sections
      if (stmtUpper.includes('DROP TYPE') || stmtUpper.includes('CREATE TYPE')) currentSection = 'types';
      else if (stmtUpper.includes('DROP TABLE') || stmtUpper.includes('CREATE TABLE')) currentSection = 'tables';
      else if (stmtUpper.includes('DROP VIEW') || stmtUpper.includes('CREATE VIEW') || stmtUpper.includes('CREATE MATERIALIZED')) currentSection = 'views';
      else if (stmtUpper.includes('FUNCTION') || stmtUpper.includes('PROCEDURE')) currentSection = 'functions';
      else if (stmtUpper.includes('TRIGGER')) currentSection = 'triggers';
      else if (stmtUpper.includes('INSERT INTO')) currentSection = 'data';
      else if (stmtUpper.includes('SETVAL')) currentSection = 'sequences';

      // Afficher la progression toutes les 50 statements
      if (i % 50 === 0 || i === statements.length - 1) {
        const progress = Math.round((i / statements.length) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const remaining = Math.round((elapsed / (i + 1)) * (statements.length - i - 1));

        process.stdout.write(`\r   📊 Progress: ${i + 1}/${statements.length} (${progress}%) | ⏱️  ${elapsed}s écoulés | ⏳ ~${remaining}s restants | 📁 Section: ${currentSection}\n`);
      }

      try {
        await client.query(stmt);
        executed++;

        // Update section stats
        if (currentSection === 'types' && (stmtUpper.includes('CREATE TYPE') || stmtUpper.includes('DROP TYPE'))) sectionStats.types++;
        else if (currentSection === 'tables' && (stmtUpper.includes('CREATE TABLE') || stmtUpper.includes('DROP TABLE'))) sectionStats.tables++;
        else if (currentSection === 'views' && (stmtUpper.includes('CREATE VIEW') || stmtUpper.includes('DROP VIEW'))) sectionStats.views++;
        else if (currentSection === 'functions' && stmtUpper.includes('FUNCTION')) sectionStats.functions++;
        else if (currentSection === 'triggers' && stmtUpper.includes('TRIGGER')) sectionStats.triggers++;
        else if (currentSection === 'data' && stmtUpper.includes('INSERT')) sectionStats.data++;
        else if (currentSection === 'sequences' && stmtUpper.includes('SETVAL')) sectionStats.sequences++;

      } catch (error: any) {
        errorCodes.set(error.code, (errorCodes.get(error.code) || 0) + 1);

        if (['42P01', '42P07', '42710', '42723', '42P16', '42704', '42P06'].includes(error.code)) {
          warnings++;
          console.log(`   ⚠️  Avertissement ignoré (${error.code}): ${error.message}`);
        } else if (error.code === '23505') {
          // Erreur de contrainte unique - probablement des doublons
          warnings++;
          console.log(`   ⚠️  Doublon détecté (${error.code}): ${error.message}`);
        } else if (error.code === '42830') {
          // Erreur de contrainte FK - problème d'ordre d'insertion
          errors++;
          console.log(`   ❌ Erreur FK (${error.code}): ${error.message}`);
        } else if (error.code === '42601') {
          // Erreur de syntaxe - afficher plus de contexte
          errors++;
          console.log(`   ❌ Erreur syntaxe (${error.code}): ${error.message}`);
          console.log(`      Statement: ${stmt.substring(0, 200)}...`);
        } else {
          errors++;
          const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
          console.log(`   ❌ ${error.code}: ${error.message.substring(0, 60)}...`);
          console.log(`      ${preview}...\n`);
        }
      }
    }

    await client.end();

    console.log('\n' + '═'.repeat(80));
    console.log('✅ RESTAURATION TERMINÉE');
    console.log('═'.repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   • ${executed} statements exécutés`);
    console.log(`   • ${warnings} avertissements (ignorés)`);
    console.log(`   • ${errors} erreurs`);
    console.log(`\n   Détails:`);
    console.log(`      • Types: ${sectionStats.types}`);
    console.log(`      • Tables: ${sectionStats.tables}`);
    console.log(`      • Vues: ${sectionStats.views}`);
    console.log(`      • Fonctions: ${sectionStats.functions}`);
    console.log(`      • Triggers: ${sectionStats.triggers}`);
    console.log(`      • Données (INSERT): ${sectionStats.data}`);
    console.log(`      • Séquences: ${sectionStats.sequences}`);

    if (errorCodes.size > 0) {
      console.log('\n   Codes erreur:');
      errorCodes.forEach((count, code) => {
        const desc = code === '42P01' ? 'table undefined' :
                     code === '42P07' ? 'table already exists' :
                     code === '42710' ? 'index already exists' :
                     code === '23505' ? 'duplicate key' :
                     code === '42830' ? 'FK constraint error' :
                     code === '42P06' ? 'schema exists' :
                     code;
        console.log(`      ${code} (${desc}): ${count}`);
      });
    }

    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Vérifier les tables dans Supabase Dashboard');
    console.log('   2. Vérifier les vues et fonctions');
    console.log('   3. Tester l\'application');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    rl.close();
  }
}

restoreDatabase(process.argv[2]);
