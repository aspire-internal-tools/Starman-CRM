using '../main.bicep'

param environment = 'prod'
param location = 'canadacentral'
param owner = 'Aspire'
param costCentre = 'starman-production'
param deployApplication = false
param postgresAdminPassword = readEnvironmentVariable('STARMAN_POSTGRES_ADMIN_PASSWORD')
param jwtSecret = readEnvironmentVariable('STARMAN_JWT_SECRET')
param postgresSku = 'Standard_D2ds_v5'
param postgresStorageGb = 64
param postgresBackupDays = 35
param enableCanadianGeoBackup = false
param logRetentionDays = 365
param minReplicas = 2
param maxReplicas = 6
param containerCpu = '1.0'
param containerMemory = '2Gi'
