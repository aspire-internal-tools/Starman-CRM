using '../main.bicep'

param environment = 'dev'
param location = 'canadacentral'
param owner = 'Aspire'
param costCentre = 'starman-pilot'
param deployApplication = false
param postgresAdminPassword = readEnvironmentVariable('STARMAN_POSTGRES_ADMIN_PASSWORD')
param jwtSecret = readEnvironmentVariable('STARMAN_JWT_SECRET')
param postgresSku = 'Standard_B1ms'
param postgresStorageGb = 32
param postgresBackupDays = 7
param enableCanadianGeoBackup = false
param logRetentionDays = 30
param minReplicas = 0
param maxReplicas = 2
param containerCpu = '0.5'
param containerMemory = '1Gi'
