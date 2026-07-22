targetScope = 'resourceGroup'

param location string
param baseName string
param workspaceId string
param alertEmail string
param tags object

var alertsEnabled = !empty(alertEmail)

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-${baseName}'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: take(replace(baseName, '-', ''), 12)
    enabled: alertsEnabled
    emailReceivers: alertsEnabled ? [
      {
        name: 'starman-operations'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ] : []
  }
}

resource applicationErrors 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-${baseName}-application-errors'
  location: location
  tags: tags
  properties: {
    displayName: 'Starman application errors'
    description: 'Metadata-only alert for repeated server error log entries. Client content must never be written to these logs.'
    enabled: alertsEnabled
    severity: 2
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [
      workspaceId
    ]
    criteria: {
      allOf: [
        {
          query: 'ContainerAppConsoleLogs_CL | where Log_s has "\\"level\\":\\"error\\"" | summarize ErrorCount=count()'
          timeAggregation: 'Count'
          metricMeasureColumn: 'ErrorCount'
          operator: 'GreaterThan'
          threshold: 4
          failingPeriods: {
            minFailingPeriodsToAlert: 1
            numberOfEvaluationPeriods: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertsEnabled ? [
        actionGroup.id
      ] : []
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: true
  }
}

resource authenticationFailures 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-${baseName}-authentication-failures'
  location: location
  tags: tags
  properties: {
    displayName: 'Starman repeated authentication failures'
    description: 'Metadata-only alert for repeated rejected authentication requests.'
    enabled: alertsEnabled
    severity: 2
    evaluationFrequency: 'PT5M'
    windowSize: 'PT10M'
    scopes: [
      workspaceId
    ]
    criteria: {
      allOf: [
        {
          query: 'ContainerAppConsoleLogs_CL | where Log_s has "\\"event\\":\\"request.complete\\"" and Log_s has "\\"status\\":401" | summarize FailureCount=count()'
          timeAggregation: 'Count'
          metricMeasureColumn: 'FailureCount'
          operator: 'GreaterThan'
          threshold: 9
          failingPeriods: {
            minFailingPeriodsToAlert: 1
            numberOfEvaluationPeriods: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertsEnabled ? [
        actionGroup.id
      ] : []
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: true
  }
}

resource unusualAuthorizationFailures 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-${baseName}-authorization-failures'
  location: location
  tags: tags
  properties: {
    displayName: 'Starman unusual authorization failures'
    description: 'Metadata-only alert for repeated forbidden requests that can indicate cross-role or cross-organization access attempts.'
    enabled: alertsEnabled
    severity: 1
    evaluationFrequency: 'PT5M'
    windowSize: 'PT10M'
    scopes: [
      workspaceId
    ]
    criteria: {
      allOf: [
        {
          query: 'ContainerAppConsoleLogs_CL | where Log_s has "\\"event\\":\\"request.complete\\"" and Log_s has "\\"status\\":403" | summarize FailureCount=count()'
          timeAggregation: 'Count'
          metricMeasureColumn: 'FailureCount'
          operator: 'GreaterThan'
          threshold: 9
          failingPeriods: {
            minFailingPeriodsToAlert: 1
            numberOfEvaluationPeriods: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertsEnabled ? [
        actionGroup.id
      ] : []
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: true
  }
}

resource databaseRecoveryFailures 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-${baseName}-database-recovery-failures'
  location: location
  tags: tags
  properties: {
    displayName: 'Starman database backup or restore failures'
    description: 'Alerts on failed PostgreSQL backup or restore operations after the approved subscription activity log is routed to this workspace.'
    enabled: alertsEnabled
    severity: 1
    evaluationFrequency: 'PT15M'
    windowSize: 'PT30M'
    scopes: [
      workspaceId
    ]
    criteria: {
      allOf: [
        {
          query: 'AzureActivity | where ResourceProviderValue =~ "MICROSOFT.DBFORPOSTGRESQL" | where ActivityStatusValue =~ "Failure" | where OperationNameValue has_any ("backup", "restore") | summarize FailureCount=count()'
          timeAggregation: 'Count'
          metricMeasureColumn: 'FailureCount'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            minFailingPeriodsToAlert: 1
            numberOfEvaluationPeriods: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: alertsEnabled ? [
        actionGroup.id
      ] : []
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: true
  }
}

resource azureServiceHealth 'Microsoft.Insights/activityLogAlerts@2020-10-01' = {
  name: 'alert-${baseName}-service-health'
  location: 'global'
  tags: tags
  properties: {
    enabled: alertsEnabled
    description: 'Azure service-health events affecting the approved Starman subscription.'
    scopes: [
      subscription().id
    ]
    condition: {
      allOf: [
        {
          field: 'category'
          equals: 'ServiceHealth'
        }
      ]
    }
    actions: {
      actionGroups: alertsEnabled ? [
        {
          actionGroupId: actionGroup.id
        }
      ] : []
    }
  }
}

output actionGroupId string = actionGroup.id
output enabled bool = alertsEnabled
