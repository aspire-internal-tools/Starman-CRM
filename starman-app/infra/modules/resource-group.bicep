targetScope = 'subscription'

param name string
param location string
param tags object

resource group 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: name
  location: location
  tags: tags
}

output id string = group.id
output name string = group.name
