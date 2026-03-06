import { supabase } from './api/supabaseClient';
import { logger } from '../utils/logger';

const EDI_API_URL = import.meta.env.VITE_EDI_API_URL || 'http://localhost:5000';
const EDI_API_TIMEOUT = parseInt(import.meta.env.VITE_EDI_API_TIMEOUT || '30000', 10);

export interface EdiTransmissionResult {
    success: boolean;
    xmlFile?: string;
    ediFile?: string;
    uploadedToSftp?: boolean;
    error?: string;
}

/**
 * Service de transmission EDI CODECO.
 * 
 * Garantit qu'une seule transmission EDI GATE IN est effectuée par opération.
 * Le flag edi_gate_in_transmitted sur gate_in_operations est la source de vérité.
 */
export class EdiTransmissionService {

    /**
     * Transmet l'EDI GATE IN pour une opération donnée.
     * Idempotent : si déjà transmis, ne fait rien.
     */
    async transmitGateInEDI(gateInOperationId: string): Promise<EdiTransmissionResult> {
        try {
            // 1. Vérifier si l'EDI a déjà été transmis (guard clause)
            // Include gate_in_transport_info for equipment_reference
            const { data: operation, error: fetchError } = await supabase
                .from('gate_in_operations')
                .select(`
          id,
          container_id,
          container_number,
          client_code,
          client_name,
          container_type,
          container_size,
          container_iso_code,
          is_high_cube,
          full_empty,
          assigned_location,
          classification,
          transaction_type,
          truck_arrival_date,
          truck_arrival_time,
          operator_name,
          yard_id,
          edi_gate_in_transmitted,
          gate_in_transport_info (
            equipment_reference,
            transport_company,
            vehicle_number
          )
        `)
                .eq('id', gateInOperationId)
                .single();

            if (fetchError || !operation) {
                logger.error('EDI: Could not fetch gate_in_operation', 'EdiTransmissionService', fetchError);
                return { success: false, error: 'Opération introuvable' };
            }

            // Guard : EDI déjà transmis → on ne renvoie pas
            if (operation.edi_gate_in_transmitted === true) {
                logger.info(`EDI: Déjà transmis pour l'opération ${gateInOperationId}, ignoré.`, 'EdiTransmissionService');
                return { success: true, error: 'EDI déjà transmis (ignoré)' };
            }

            // 2. Construire le payload CODECO
            const payload = this.buildCodecoPayload(operation);

            // 3. Appeler l'API EDI Python
            logger.info(`EDI: Transmission GATE IN pour ${operation.container_number}`, 'EdiTransmissionService');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), EDI_API_TIMEOUT);

            let apiResponse: Response;
            try {
                apiResponse = await fetch(`${EDI_API_URL}/api/v1/codeco/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                logger.error(`EDI: Erreur API ${apiResponse.status}: ${errorText}`, 'EdiTransmissionService');
                return { success: false, error: `API EDI erreur: ${apiResponse.status}` };
            }

            const apiResult = await apiResponse.json();

            // 4. Marquer comme transmis en DB
            const { error: updateError } = await supabase
                .from('gate_in_operations')
                .update({
                    edi_gate_in_transmitted: true,
                    edi_transmitted: true,
                    edi_transmission_date: new Date().toISOString(),
                })
                .eq('id', gateInOperationId);

            if (updateError) {
                logger.error('EDI: Impossible de marquer comme transmis', 'EdiTransmissionService', updateError);
                // Ne pas échouer l'opération globale pour ça
            }

            // 5. Marquer le conteneur comme transmis aussi (si possible)
            await supabase
                .from('containers')
                .update({ edi_gate_in_transmitted: true })
                .eq('id', operation.container_id || '')
                .eq('edi_gate_in_transmitted', false);

            logger.info(`EDI: Transmission réussie pour ${operation.container_number}`, 'EdiTransmissionService');

            return {
                success: true,
                xmlFile: apiResult.xml_file,
                ediFile: apiResult.edi_file,
                uploadedToSftp: apiResult.uploaded_to_sftp,
            };

        } catch (error: any) {
            if (error?.name === 'AbortError') {
                logger.error('EDI: Timeout - API EDI non disponible', 'EdiTransmissionService');
                return { success: false, error: 'Timeout API EDI (vérifiez que le service Python est démarré)' };
            }
            logger.error('EDI: Erreur inattendue', 'EdiTransmissionService', error);
            return { success: false, error: error?.message || 'Erreur EDI inconnue' };
        }
    }

    /**
     * Construit le payload JSON pour l'API EDI CODECO.
     */
    private buildCodecoPayload(operation: any): Record<string, any> {
        const arrivalDate = operation.truck_arrival_date || new Date().toISOString().split('T')[0];
        const arrivalTime = operation.truck_arrival_time || new Date().toTimeString().slice(0, 5);
        
        // Get transport info from normalized table (first item in array)
        const transportInfo = operation.gate_in_transport_info?.[0] || {};

        return {
            // Identifiants clés
            client: operation.client_code || '',
            created_by: operation.operator_name || 'SYSTEM',

            // Données conteneur
            container_number: operation.container_number || '',
            container_size: operation.container_size || '20ft',
            container_type: operation.container_type || 'dry',
            container_iso_code: operation.container_iso_code || null,
            is_high_cube: operation.is_high_cube || false,
            full_empty: operation.full_empty || 'EMPTY',

            // Données opération
            transaction_type: 'GATE_IN',
            classification: operation.classification || 'divers',
            equipment_reference: transportInfo.equipment_reference || null,
            assigned_location: operation.assigned_location || null,

            // Données yard & transport
            yard_id: operation.yard_id || null,

            // Horodatage (les champs created_date/time sont auto-générés côté API)
            truck_arrival_date: arrivalDate,
            truck_arrival_time: arrivalTime,
        };
    }
}

export const ediTransmissionService = new EdiTransmissionService();
