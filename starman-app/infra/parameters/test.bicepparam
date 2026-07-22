using '../main.bicep'

param environment = 'test'
param location = 'canadacentral'
param owner = 'Aspire'
param costCentre = 'starman-pilot'
param deployApplication = false
param postgresAdminPassword = readEnvironmentVariable('STARMAN_POSTGRES_ADMIN_PASSWORD')
param jwtSecret = readEnvironmentVariable('STARMAN_JWT_SECRET')
param postgresSku = 'Standard_B1ms'
param postgresStorageGb = 32
param postgresBackupDays = 14
param enableCanadianGeoBackup = false
param logRetentionDays = 60
param minReplicas = 0
param maxReplicas = 3
param containerCpu = '0.5'
param containerMemory = '1Gi'
