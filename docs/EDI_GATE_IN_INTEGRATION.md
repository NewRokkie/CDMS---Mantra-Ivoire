# EDI Gate In Integration Documentation

## Overview

This document describes the complete integration of EDI (Electronic Data Interchange) transmission into the Gate In workflow. When a container is assigned to a location and the operation is completed, the system automatically generates and transmits EDI CODECO messages to notify clients about the Gate In operation.

## Workflow Integration

### 1. Gate In Process Flow

```
Container Arrival → Gate In Creation → Location Assignment → Complete Operation → EDI Transmission
```

#### Detailed Steps:

1. **Container Arrival**: Driver arrives with container at the gate
2. **Gate In Creation**: Operator creates a Gate In operation with container and client details
3. **Location Assignment**: Container is assigned to a specific stack location in the yard
4. **Complete Operation**: When "Complete Operation" is clicked in the LocationValidationModal
5. **EDI Transmission**: System automatically checks if client has EDI enabled and transmits CODECO message

### 2. EDI Integration Points

#### A. Location Validation Modal (`LocationValidationModal.tsx`)
- **Trigger**: "Complete Operation" button click
- **Action**: Calls `handleLocationValidation` in main GateIn component

#### B. Gate In Component (`GateIn.tsx`)
- **Function**: `handleLocationValidation`
- **EDI Integration**: After successful container assignment, processes EDI transmission
- **Error Handling**: EDI failures don't block the main operation

#### C. EDI Management Service (`ediManagement.ts`)
- **Function**: `processGateIn`
- **Purpose**: Handles EDI CODECO generation and transmission
- **Integration**: Uses real data service for client-specific EDI processing

## Technical Implementation

### 1. Database Schema Changes

#### New Fields in `gate_in_operations` Table:
```sql
-- EDI tracking fields
edi_transmitted boolean DEFAULT false,
edi_transmission_date timestamptz,
edi_log_id uuid REFERENCES edi_transmission_logs(id),
edi_error_message text
```

#### EDI Management Tables:
- `edi_server_configurations`: FTP/SFTP server settings
- `edi_client_settings`: Client-specific EDI configuration
- `edi_transmission_logs`: Complete transmission history and status

### 2. Code Integration

#### Modified Files:
1. **`src/components/Gates/GateIn.tsx`**
   - Enhanced `handleLocationValidation` function
   - Added EDI processing after container assignment
   - Added EDI status in success messages

2. **`src/components/Gates/GateIn/MobileOperationsTable.tsx`**
   - Added EDI status indicators
   - New `getEDIStatusBadge` function
   - Enhanced operation interface with EDI fields

3. **Database Migration**
   - `supabase/migrations/20251218120000_add_edi_fields_to_gate_operations.sql`
   - Adds EDI fields to gate operations tables
   - Creates automatic EDI log triggers

### 3. EDI Data Mapping

#### Gate In Operation → EDI CODECO Data:
```typescript
const ediContainerData = {
  containerNumber: operation.containerNumber,
  size: operation.containerSize, // '20ft' | '40ft' | '45ft'
  type: operation.containerType, // 'dry' | 'reefer' | 'tank' | etc.
  clientName: operation.clientName,
  clientCode: operation.clientCode,
  transporter: operation.transportCompany,
  vehicleNumber: operation.truckNumber,
  userName: user?.name,
  containerLoadStatus: operation.fullEmpty, // 'FULL' | 'EMPTY'
  timestamp: new Date(),
  location: locationData.assignedLocation,
  yardId: currentYard?.id
};
```

## EDI Status Indicators

### 1. Visual Indicators

#### Desktop Table:
- New "EDI Status" column
- Color-coded badges:
  - 🟢 **Green**: "EDI Sent" (successful transmission)
  - 🔴 **Red**: "EDI Failed" (transmission failed)
  - ⚪ **Gray**: "No EDI" (client doesn't have EDI enabled)

#### Mobile Cards:
- EDI status badges displayed alongside operation status
- Same color coding as desktop

### 2. Status Logic:
```typescript
// Only show EDI status for completed operations
if (operation.status === 'completed') {
  if (operation.ediTransmitted === true) {
    // Show green "EDI Sent" badge
  } else if (operation.ediTransmitted === false) {
    // Show red "EDI Failed" badge  
  } else {
    // Show gray "No EDI" badge
  }
}
```

## Error Handling

### 1. Non-Blocking Design
- EDI transmission failures **DO NOT** block the main Gate In operation
- Container assignment always completes successfully
- EDI errors are logged separately

### 2. Error Scenarios:
1. **Client has no EDI configuration**: Operation completes, no EDI attempted
2. **EDI service unavailable**: Operation completes, EDI marked as failed
3. **Invalid EDI data**: Operation completes, error logged in `edi_error_message`
4. **SFTP connection failure**: Operation completes, transmission marked as failed

### 3. Error Recovery:
- Failed EDI transmissions can be retried from EDI Management interface
- Error messages stored for debugging
- Transmission logs maintain complete audit trail

## Configuration

### 1. Client EDI Setup

#### Enable EDI for a Client:
1. Go to **EDI Management** → **Client EDI Settings**
2. Find the client or add new client configuration
3. Enable "EDI Enabled" toggle
4. Configure Gate In/Gate Out settings
5. Assign to appropriate EDI server

#### EDI Server Configuration:
1. Go to **EDI Management** → **FTP/SFTP Servers**
2. Configure server connection details:
   - Host, Port, Username, Password
   - Remote path for file uploads
   - Partner codes and file naming patterns

### 2. Automatic Client Detection:
- System automatically detects if client has EDI enabled
- Uses client code to match EDI configuration
- Falls back to client name if code match fails

## Testing

### 1. Test Script:
```bash
# Run EDI integration test
npm run test:edi-gate-in
```

### 2. Manual Testing:
1. Create a Gate In operation for a client with EDI enabled
2. Assign container to a location
3. Click "Complete Operation"
4. Verify EDI status appears in operations list
5. Check EDI Management → Transmission History for log entry

### 3. Test Scenarios:
- ✅ Client with EDI enabled → Should show "EDI Sent"
- ✅ Client without EDI → Should show "No EDI"
- ✅ EDI service failure → Should show "EDI Failed" but operation completes
- ✅ Invalid container data → Should show "EDI Failed" with error message

## Monitoring and Troubleshooting

### 1. EDI Management Dashboard:
- **Location**: Main Menu → EDI Management
- **Features**:
  - Real-time EDI statistics
  - Transmission history with filtering
  - Server configuration status
  - Client EDI settings overview

### 2. Transmission Logs:
- Complete audit trail of all EDI transmissions
- Status tracking (pending, success, failed, retrying)
- Error messages for failed transmissions
- File content and metadata storage

### 3. Common Issues:

#### "EDI Failed" Status:
1. Check EDI Management → Transmission History for error details
2. Verify client EDI configuration is enabled
3. Test EDI server connection in server configuration
4. Check container data completeness

#### Missing EDI Status:
1. Verify operation status is "completed"
2. Check if client has EDI configuration
3. Ensure database migration was applied
4. Refresh the operations list

## Benefits

### 1. Operational Benefits:
- **Automated Notifications**: Clients receive immediate notification of container arrivals
- **Reduced Manual Work**: No need for manual EDI file generation
- **Real-time Updates**: Instant transmission upon operation completion
- **Error Resilience**: Main operations never blocked by EDI issues

### 2. Technical Benefits:
- **Non-blocking Architecture**: EDI processing doesn't impact core operations
- **Comprehensive Logging**: Complete audit trail for compliance
- **Flexible Configuration**: Per-client EDI settings
- **Scalable Design**: Supports multiple EDI servers and protocols

### 3. Business Benefits:
- **Improved Client Satisfaction**: Faster notification of container status
- **Operational Efficiency**: Automated compliance with EDI requirements
- **Audit Compliance**: Complete transmission history and status tracking
- **Cost Reduction**: Reduced manual EDI processing overhead

## Future Enhancements

### 1. Planned Features:
- **Acknowledgment Processing**: Handle EDI acknowledgment messages
- **Batch Processing**: Group multiple containers in single EDI message
- **Advanced Retry Logic**: Configurable retry policies per client
- **Real-time Monitoring**: Live EDI transmission status dashboard

### 2. Integration Opportunities:
- **Gate Out Integration**: Apply same pattern to Gate Out operations
- **Container Movement**: EDI for internal container movements
- **Damage Reports**: EDI transmission for damage assessments
- **Custom Messages**: Support for client-specific EDI message formats

## Support

### 1. Documentation:
- **EDI Specification**: `docs/EDI-CODECO-SPECIFICATION.md`
- **System Setup**: `docs/EDI-SYSTEM-README.md`
- **API Reference**: `docs/EDI-IMPLEMENTATION-SUMMARY.md`

### 2. Troubleshooting:
- Check browser console for JavaScript errors
- Review EDI Management logs for transmission details
- Verify database migration status
- Test EDI server connectivity

### 3. Contact:
- **Technical Issues**: Check GitHub issues or create new issue
- **Configuration Help**: Refer to EDI Management interface help text
- **Integration Questions**: Review this documentation and test scripts