targetScope = 'resourceGroup'

param location string
param environmentName string
param infrastructureSubnetId string
param workspaceCustomerId string
@secure()
param workspaceSharedKey string
param tags object

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: workspaceCustomerId
        sharedKey: workspaceSharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: false
    }
    zoneRedundant: false
    peerAuthentication: {
      mtls: {
        enabled: false
      }
    }
  }
}

output id string = environment.id
output name string = environment.name
output defaultDomain string = environment.properties.defaultDomain
