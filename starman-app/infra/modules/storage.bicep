targetScope = 'resourceGroup'

param location string
param storageName string
param privateEndpointSubnetId string
param privateDnsZoneId string
param deleteRetentionDays int
param tags object

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: tags
  sku: {
    name: 'Standard_ZRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    }
    encryption: {
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
      }
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    changeFeed: {
      enabled: true
      retentionInDays: 90
    }
    deleteRetentionPolicy: {
      enabled: true
      days: deleteRetentionDays
      allowPermanentDelete: false
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: deleteRetentionDays
    }
    isVersioningEnabled: true
  }
}

resource containers 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = [for containerName in [
  'client-files'
  'transcripts'
  'exports'
]: {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
    immutableStorageWithVersioning: {
      enabled: false
    }
  }
}]

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${storageName}-blob'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'blob'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [
            'blob'
          ]
        }
      }
    ]
  }
}

resource dnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: {
          privateDnsZoneId: privateDnsZoneId
        }
      }
    ]
  }
}

output id string = storage.id
output name string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
