targetScope = 'resourceGroup'

param location string
param serverName string
param administratorLogin string
@secure()
param administratorPassword string
param delegatedSubnetId string
param privateDnsZoneId string
param skuName string
param storageSizeGb int
param backupRetentionDays int
param geoRedundantBackup bool
param preventDeletion bool
param tags object

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: startsWith(skuName, 'Standard_B') ? 'Burstable' : 'GeneralPurpose'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    version: '16'
    createMode: 'Default'
    availabilityZone: '1'
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackup ? 'Enabled' : 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: delegatedSubnetId
      privateDnsZoneArmResourceId: privateDnsZoneId
      publicNetworkAccess: 'Disabled'
    }
    storage: {
      storageSizeGB: storageSizeGb
      autoGrow: 'Enabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0
      startHour: 9
      startMinute: 0
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: 'starman'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource requireSecureTransport 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: server
  name: 'require_secure_transport'
  properties: {
    source: 'user-override'
    value: 'on'
  }
}

resource serverProtection 'Microsoft.Authorization/locks@2020-05-01' = if (preventDeletion) {
  name: 'protect-production-database'
  scope: server
  properties: {
    level: 'CanNotDelete'
    notes: 'Production Starman database deletion requires an approved lock-removal change.'
  }
}

output id string = server.id
output name string = server.name
output fqdn string = server.properties.fullyQualifiedDomainName
