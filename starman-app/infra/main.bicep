targetScope = 'subscription'

@description('Short lowercase resource prefix used in Azure resource names.')
@minLength(3)
@maxLength(12)
param namePrefix string = 'starman'

@description('Deployment environment.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string

@description('Primary Canadian Azure region. Non-Canadian regions are rejected.')
@allowed([
  'canadacentral'
  'canadaeast'
])
param location string = 'canadacentral'

@description('Azure subscription owner or accountable team tag.')
param owner string = 'Aspire'

@description('Cost centre or internal project code used for Azure tagging.')
param costCentre string = 'starman-pilot'

@description('Deploy the Starman Container App after its image has been pushed to the generated registry.')
param deployApplication bool = false

@description('Container image tag already pushed to the generated Azure Container Registry.')
param imageTag string = 'pilot'

@description('Approved notification address. Leave blank to create disabled alert rules.')
param alertEmail string = ''

@description('PostgreSQL administrator username. This is not an application user.')
param postgresAdminUser string = 'starmanadmin'

@secure()
@description('Generated PostgreSQL administrator password supplied at deployment time.')
param postgresAdminPassword string

@secure()
@description('Generated JWT signing secret supplied at deployment time.')
param jwtSecret string

@description('PostgreSQL Flexible Server compute SKU.')
param postgresSku string = 'Standard_B1ms'

@description('PostgreSQL storage allocation in GiB.')
@minValue(32)
param postgresStorageGb int = 32

@description('PostgreSQL point-in-time backup retention in days.')
@minValue(7)
@maxValue(35)
param postgresBackupDays int = 14

@description('Enable PostgreSQL geo-redundant backup to the paired Canadian region only after recovery replication is approved.')
param enableCanadianGeoBackup bool = false

@description('Log Analytics retention in days.')
@minValue(30)
param logRetentionDays int = 90

@description('Minimum Container App replicas. Production should use at least two after capacity approval.')
@minValue(0)
param minReplicas int = 0

@description('Maximum Container App replicas.')
@minValue(1)
param maxReplicas int = 3

@description('CPU cores allocated to each Starman replica.')
@allowed([
  '0.5'
  '0.75'
  '1.0'
  '1.25'
  '1.5'
  '1.75'
  '2.0'
])
param containerCpu string = '0.5'

@description('Memory allocated to each Starman replica.')
@allowed([
  '1Gi'
  '1.5Gi'
  '2Gi'
  '3Gi'
  '3.5Gi'
  '4Gi'
])
param containerMemory string = '1Gi'

var compactPrefix = toLower(replace(namePrefix, '-', ''))
var suffix = toLower(uniqueString(subscription().id, namePrefix, environment))
var resourceGroupName = 'rg-${namePrefix}-${environment}-${location}'
var baseName = '${namePrefix}-${environment}-${suffix}'
var storageName = take('${compactPrefix}${environment}${suffix}', 24)
var registryName = take('${compactPrefix}${environment}${suffix}', 50)
var vaultName = take('kv-${namePrefix}-${environment}-${suffix}', 24)
var tags = {
  application: 'Starman CRM'
  environment: environment
  owner: owner
  costCentre: costCentre
  dataClassification: 'Confidential-Client'
  residency: 'Canada'
  managedBy: 'Bicep'
}

module resourceGroupDeployment 'modules/resource-group.bicep' = {
  name: 'resource-group-${environment}'
  params: {
    name: resourceGroupName
    location: location
    tags: tags
  }
}

module network 'modules/network.bicep' = {
  name: 'network-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    baseName: baseName
    tags: tags
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    baseName: baseName
    retentionDays: logRetentionDays
    tags: tags
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    baseName: baseName
    tags: tags
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    registryName: registryName
    tags: tags
  }
}

module vault 'modules/key-vault.bicep' = {
  name: 'key-vault-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    vaultName: vaultName
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    privateDnsZoneId: network.outputs.keyVaultPrivateDnsZoneId
    enablePurgeProtection: environment == 'prod'
    tags: tags
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    storageName: storageName
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    privateDnsZoneId: network.outputs.blobPrivateDnsZoneId
    deleteRetentionDays: environment == 'prod' ? 30 : 14
    tags: tags
  }
}

module database 'modules/postgresql.bicep' = {
  name: 'postgresql-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    serverName: 'psql-${baseName}'
    administratorLogin: postgresAdminUser
    administratorPassword: postgresAdminPassword
    delegatedSubnetId: network.outputs.databaseSubnetId
    privateDnsZoneId: network.outputs.postgresPrivateDnsZoneId
    skuName: postgresSku
    storageSizeGb: postgresStorageGb
    backupRetentionDays: postgresBackupDays
    geoRedundantBackup: enableCanadianGeoBackup
    preventDeletion: environment == 'prod'
    tags: tags
  }
}

var databaseUrl = 'postgresql://${postgresAdminUser}:${uriComponent(postgresAdminPassword)}@${database.outputs.fqdn}:5432/starman?schema=public&sslmode=require'

module configurationSecrets 'modules/configuration-secrets.bicep' = {
  name: 'configuration-secrets-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    vaultName: vault.outputs.name
    databaseUrl: databaseUrl
    jwtSecret: jwtSecret
  }
}

module containerEnvironment 'modules/container-environment.bicep' = {
  name: 'container-environment-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    environmentName: 'cae-${baseName}'
    infrastructureSubnetId: network.outputs.containerAppsSubnetId
    workspaceCustomerId: monitoring.outputs.workspaceCustomerId
    workspaceSharedKey: monitoring.outputs.workspaceSharedKey
    tags: tags
  }
}

resource registryExisting 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  name: registry.outputs.name
}

resource vaultExisting 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  name: vault.outputs.name
}

resource storageExisting 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  name: storage.outputs.name
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployApplication) {
  name: guid(registryExisting.id, identity.outputs.principalId, 'AcrPull')
  scope: registryExisting
  properties: {
    principalId: identity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployApplication) {
  name: guid(vaultExisting.id, identity.outputs.principalId, 'KeyVaultSecretsUser')
  scope: vaultExisting
  properties: {
    principalId: identity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

resource storageBlobDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployApplication) {
  name: guid(storageExisting.id, identity.outputs.principalId, 'StorageBlobDataContributor')
  scope: storageExisting
  properties: {
    principalId: identity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

module application 'modules/container-app.bicep' = if (deployApplication) {
  name: 'container-app-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  dependsOn: [
    acrPull
    keyVaultSecretsUser
    storageBlobDataContributor
    configurationSecrets
  ]
  params: {
    location: location
    appName: 'ca-${baseName}'
    environmentId: containerEnvironment.outputs.id
    identityId: identity.outputs.id
    registryServer: registry.outputs.loginServer
    image: '${registry.outputs.loginServer}/starman-server:${imageTag}'
    keyVaultUri: vault.outputs.uri
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    webOrigin: 'https://ca-${baseName}.${containerEnvironment.outputs.defaultDomain}'
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    cpu: containerCpu
    memory: containerMemory
    tags: tags
  }
}

module alerts 'modules/alerts.bicep' = {
  name: 'alerts-${environment}'
  scope: resourceGroup(resourceGroupDeployment.outputs.name)
  params: {
    location: location
    baseName: baseName
    workspaceId: monitoring.outputs.workspaceId
    alertEmail: alertEmail
    tags: tags
  }
}

output resourceGroupName string = resourceGroupDeployment.outputs.name
output registryName string = registry.outputs.name
output registryLoginServer string = registry.outputs.loginServer
output keyVaultName string = vault.outputs.name
output storageAccountName string = storage.outputs.name
output postgresHost string = database.outputs.fqdn
output containerAppName string = deployApplication ? application!.outputs.name : 'not-deployed'
output containerAppUrl string = deployApplication ? application!.outputs.url : 'not-deployed'
output applicationDeploymentEnabled bool = deployApplication
