targetScope = 'resourceGroup'

param vaultName string

@secure()
param databaseUrl string

@secure()
param jwtSecret string

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: vaultName
}

resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'database-url'
  properties: {
    value: databaseUrl
    contentType: 'Starman PostgreSQL connection string'
  }
}

resource jwtSecretValue 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'jwt-secret'
  properties: {
    value: jwtSecret
    contentType: 'Starman JWT signing secret'
  }
}

output databaseUrlSecretUri string = databaseUrlSecret.properties.secretUriWithVersion
output jwtSecretUri string = jwtSecretValue.properties.secretUriWithVersion
