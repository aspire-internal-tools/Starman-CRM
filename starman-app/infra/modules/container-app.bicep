targetScope = 'resourceGroup'

param location string
param appName string
param environmentId string
param identityId string
param registryServer string
param image string
param keyVaultUri string
@secure()
param applicationInsightsConnectionString string
param webOrigin string
param minReplicas int
param maxReplicas int
param cpu string
param memory string
param tags object

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 4000
        transport: 'http'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryServer
          identity: identityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: '${keyVaultUri}secrets/database-url'
          identity: identityId
        }
        {
          name: 'jwt-secret'
          keyVaultUrl: '${keyVaultUri}secrets/jwt-secret'
          identity: identityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'starman-server'
          image: image
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '4000'
            }
            {
              name: 'TRUST_PROXY'
              value: '1'
            }
            {
              name: 'WEB_ORIGIN'
              value: webOrigin
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'JWT_EXPIRES_IN'
              value: '12h'
            }
            {
              name: 'AI_PROVIDER'
              value: 'simulated'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsightsConnectionString
            }
          ]
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 4000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/ready'
                port: 4000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 15
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output id string = app.id
output name string = app.name
output url string = 'https://${app.properties.configuration.ingress.fqdn}'
