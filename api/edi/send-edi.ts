import SftpClient from 'ssh2-sftp-client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface SendEDIRequest {
  fileName: string;
  fileContent: string;
  clientName: string;
  clientCode?: string;
  containerNumber: string;
  operation: 'GATE_IN' | 'GATE_OUT';
  transmissionLogId?: string;
}

interface EDIServerConfig {
  id: string;
  name: string;
  type: 'FTP' | 'SFTP';
  host: string;
  port: number;
  username: string;
  password: string;
  remote_path: string;
  enabled: boolean;
  test_mode: boolean;
  timeout: number;
  retry_attempts: number;
  partner_code: string;
  sender_code: string;
  file_name_pattern: string;
  assigned_clients: string[];
  is_default: boolean;
}

/**
 * Initialise le client Supabase pour les API routes Vercel
 * Uses service role key to bypass RLS policies
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Récupère la configuration EDI pour un client depuis Supabase
 */
async function getEDIConfigForClient(
  clientName: string, 
  clientCode?: string
): Promise<EDIServerConfig | null> {
  try {
    const supabase = getSupabaseClient();
    
    const normalizedClientCode = clientCode?.toUpperCase().trim();
    const normalizedClientName = clientName.toUpperCase().trim();

    console.log('Looking for EDI config:', {
      clientCode: normalizedClientCode,
      clientName: normalizedClientName,
      originalClientCode: clientCode
    });

    // 1. Essayer de trouver une configuration spécifique via edi_client_settings
    if (normalizedClientCode || clientCode) {
      // First, try to find the client settings record
      const { data: clientSettingsOnly, error: settingsError } = await supabase
        .from('edi_client_settings')
        .select('*')
        .eq('client_code', clientCode || normalizedClientCode)
        .eq('edi_enabled', true)
        .maybeSingle();

      console.log('Client settings only lookup:', {
        found: !!clientSettingsOnly,
        error: settingsError?.message,
        serverConfigId: clientSettingsOnly?.server_config_id
      });

      if (clientSettingsOnly && clientSettingsOnly.server_config_id) {
        // Now get the server configuration
        const { data: serverConfig, error: serverError } = await supabase
          .from('edi_server_configurations')
          .select('*')
          .eq('id', clientSettingsOnly.server_config_id)
          .eq('enabled', true)
          .single();

        console.log('Server config lookup:', {
          found: !!serverConfig,
          error: serverError?.message,
          configName: serverConfig?.name
        });

        if (serverConfig) {
          console.log('Found EDI config:', {
            configName: serverConfig.name,
            host: serverConfig.host,
            partnerCode: serverConfig.partner_code
          });
          
          return {
            id: serverConfig.id,
            name: serverConfig.name,
            type: serverConfig.type,
            host: serverConfig.host,
            port: serverConfig.port,
            username: serverConfig.username,
            password: serverConfig.password,
            remote_path: serverConfig.remote_path,
            enabled: serverConfig.enabled,
            test_mode: serverConfig.test_mode,
            timeout: serverConfig.timeout,
            retry_attempts: serverConfig.retry_attempts,
            partner_code: serverConfig.partner_code,
            sender_code: serverConfig.sender_code,
            file_name_pattern: serverConfig.file_name_pattern,
            assigned_clients: (serverConfig.assigned_clients || []) as string[],
            is_default: serverConfig.is_default
          };
        }
      }
    }

    // 2. Chercher dans les serveurs avec assigned_clients
    const { data: servers, error: serversError } = await supabase
      .from('edi_server_configurations')
      .select('*')
      .eq('enabled', true)
      .order('is_default', { ascending: false });

    if (serversError) {
      console.error('Error fetching EDI servers:', serversError);
      return null;
    }

    if (servers && servers.length > 0) {
      // Chercher un serveur avec le client assigné
      for (const server of servers) {
        const assignedClients = (server.assigned_clients || []) as string[];
        const normalizedAssigned = assignedClients.map(c => c.toUpperCase().trim());

        // Vérifier par code ou nom
        if (normalizedClientCode && normalizedAssigned.includes(normalizedClientCode)) {
          return {
            id: server.id,
            name: server.name,
            type: server.type,
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.password,
            remote_path: server.remote_path,
            enabled: server.enabled,
            test_mode: server.test_mode,
            timeout: server.timeout,
            retry_attempts: server.retry_attempts,
            partner_code: server.partner_code,
            sender_code: server.sender_code,
            file_name_pattern: server.file_name_pattern,
            assigned_clients: assignedClients,
            is_default: server.is_default
          };
        }

        if (normalizedAssigned.includes(normalizedClientName)) {
          return {
            id: server.id,
            name: server.name,
            type: server.type,
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.password,
            remote_path: server.remote_path,
            enabled: server.enabled,
            test_mode: server.test_mode,
            timeout: server.timeout,
            retry_attempts: server.retry_attempts,
            partner_code: server.partner_code,
            sender_code: server.sender_code,
            file_name_pattern: server.file_name_pattern,
            assigned_clients: assignedClients,
            is_default: server.is_default
          };
        }

        // Vérifier les correspondances partielles
        if (normalizedAssigned.some(assigned => 
          normalizedClientName.includes(assigned) || assigned.includes(normalizedClientName)
        )) {
          return {
            id: server.id,
            name: server.name,
            type: server.type,
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.password,
            remote_path: server.remote_path,
            enabled: server.enabled,
            test_mode: server.test_mode,
            timeout: server.timeout,
            retry_attempts: server.retry_attempts,
            partner_code: server.partner_code,
            sender_code: server.sender_code,
            file_name_pattern: server.file_name_pattern,
            assigned_clients: assignedClients,
            is_default: server.is_default
          };
        }
      }

      // 3. Retourner le serveur par défaut si aucune correspondance
      const defaultServer = servers.find(s => s.is_default);
      if (defaultServer) {
        return {
          id: defaultServer.id,
          name: defaultServer.name,
          type: defaultServer.type,
          host: defaultServer.host,
          port: defaultServer.port,
          username: defaultServer.username,
          password: defaultServer.password,
          remote_path: defaultServer.remote_path,
          enabled: defaultServer.enabled,
          test_mode: defaultServer.test_mode,
          timeout: defaultServer.timeout,
          retry_attempts: defaultServer.retry_attempts,
          partner_code: defaultServer.partner_code,
          sender_code: defaultServer.sender_code,
          file_name_pattern: defaultServer.file_name_pattern,
          assigned_clients: (defaultServer.assigned_clients || []) as string[],
          is_default: defaultServer.is_default
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading EDI configuration from database:', error);
    return null;
  }
}

/**
 * Met à jour le statut de transmission dans la base de données
 */
async function updateTransmissionStatus(
  logId: string,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    // First, get the current attempts count
    const { data: currentLog } = await supabase
      .from('edi_transmission_logs')
      .select('attempts')
      .eq('id', logId)
      .single();

    const currentAttempts = currentLog?.attempts || 0;
    
    await supabase
      .from('edi_transmission_logs')
      .update({
        status,
        uploaded_to_sftp: status === 'success',
        error_message: errorMessage || null,
        last_attempt: new Date().toISOString(),
        attempts: currentAttempts + 1,
        acknowledgment_received: status === 'success' ? new Date().toISOString() : null,
      })
      .eq('id', logId);
  } catch (error) {
    console.error('Error updating transmission status:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set JSON content type for all responses
    res.setHeader('Content-Type', 'application/json');
    
    // Sécurité : On n'autorise que le POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

  const { 
    fileName, 
    fileContent, 
    clientName, 
    clientCode,
    containerNumber,
    operation,
    transmissionLogId
  } = req.body as SendEDIRequest;

  // Log the received parameters for debugging
  console.log('Received request:', {
    fileName: fileName ? 'present' : 'MISSING',
    fileContent: fileContent ? `present (${fileContent.length} chars)` : 'MISSING',
    clientName: clientName ? clientName : 'MISSING',
    clientCode: clientCode ? clientCode : 'not provided',
    containerNumber: containerNumber ? containerNumber : 'MISSING',
    operation: operation ? operation : 'MISSING',
    transmissionLogId: transmissionLogId ? transmissionLogId : 'not provided'
  });

  // Validation des paramètres
  if (!fileName || !fileContent || !clientName || !containerNumber || !operation) {
    const missing = [];
    if (!fileName) missing.push('fileName');
    if (!fileContent) missing.push('fileContent');
    if (!clientName) missing.push('clientName');
    if (!containerNumber) missing.push('containerNumber');
    if (!operation) missing.push('operation');
    
    return res.status(400).json({ 
      error: 'Paramètres manquants',
      required: ['fileName', 'fileContent', 'clientName', 'containerNumber', 'operation'],
      missing: missing
    });
  }

  // Récupérer la configuration EDI pour ce client depuis Supabase
  const ediConfig = await getEDIConfigForClient(clientName, clientCode);
  
  if (!ediConfig) {
    if (transmissionLogId) {
      await updateTransmissionStatus(
        transmissionLogId, 
        'failed', 
        'Aucune configuration EDI trouvée pour ce client'
      );
    }
    
    return res.status(404).json({ 
      error: 'Aucune configuration EDI trouvée pour ce client',
      clientName,
      clientCode
    });
  }

  if (!ediConfig.enabled) {
    if (transmissionLogId) {
      await updateTransmissionStatus(
        transmissionLogId, 
        'failed', 
        'La configuration EDI pour ce client est désactivée'
      );
    }
    
    return res.status(403).json({ 
      error: 'La configuration EDI pour ce client est désactivée',
      configName: ediConfig.name
    });
  }

  const sftp = new SftpClient();
  let attempt = 0;
  const maxAttempts = ediConfig.retry_attempts || 3;

  while (attempt < maxAttempts) {
    try {
      attempt++;

      // Connexion au serveur SFTP du client
      await sftp.connect({
        host: ediConfig.host,
        port: ediConfig.port || 22,
        username: ediConfig.username,
        password: ediConfig.password,
        readyTimeout: ediConfig.timeout || 30000,
        retries: 1,
        retry_factor: 2,
        retry_minTimeout: 2000
      });

      // Construire le chemin distant complet
      const remotePath = ediConfig.remote_path.endsWith('/') 
        ? ediConfig.remote_path 
        : `${ediConfig.remote_path}/`;
      const remoteFilePath = `${remotePath}${fileName}`;

      // Envoi du fichier CODECO
      await sftp.put(Buffer.from(fileContent, 'utf-8'), remoteFilePath);

      await sftp.end();

      // Mettre à jour le statut dans la base de données
      if (transmissionLogId) {
        await updateTransmissionStatus(transmissionLogId, 'success');
      }

      return res.status(200).json({ 
        success: true,
        message: 'Fichier EDI envoyé avec succès',
        details: {
          fileName,
          server: ediConfig.name,
          host: ediConfig.host,
          remotePath: remoteFilePath,
          containerNumber,
          operation,
          attempt,
          testMode: ediConfig.test_mode,
          configId: ediConfig.id
        }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tentative ${attempt}/${maxAttempts} échouée:`, error);

      // Fermer la connexion en cas d'erreur
      try {
        await sftp.end();
      } catch {
        // Ignorer les erreurs de fermeture
      }

      // Si c'est la dernière tentative, retourner l'erreur
      if (attempt >= maxAttempts) {
        const errorMessage = `Échec après ${attempt} tentatives: ${error.message || 'Erreur inconnue'}`;
        
        // Mettre à jour le statut dans la base de données
        if (transmissionLogId) {
          await updateTransmissionStatus(transmissionLogId, 'failed', errorMessage);
        }
        
        return res.status(500).json({ 
          success: false,
          error: 'Échec de transmission EDI après plusieurs tentatives',
          details: {
            message: error.message || 'Erreur inconnue',
            server: ediConfig.name,
            host: ediConfig.host,
            attempts: attempt,
            containerNumber,
            operation,
            configId: ediConfig.id
          }
        });
      }

      // Attendre avant de réessayer (backoff exponentiel)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  // Ne devrait jamais arriver ici, mais par sécurité
  return res.status(500).json({ 
    success: false,
    error: 'Erreur inattendue lors de la transmission EDI'
  });
  } catch (error) {
    // Catch any unhandled errors and return JSON
    console.error('Unhandled error in send-edi handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    });
  }
}