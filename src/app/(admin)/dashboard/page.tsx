'use client';

import { useState, useEffect } from 'react';
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Button,
  ButtonGroup,
  Banner,
  Spinner,
  Badge,
  Text,
  Box,
  Divider,
  InlineStack,
  BlockStack,
  TextField,
  Select,
  Modal,
  Form,
  FormLayout,
  Tabs,
  RangeSlider
} from '@shopify/polaris';
import { RefreshIcon, ImportIcon, SettingsIcon, ColorIcon } from '@shopify/polaris-icons';

interface DashboardStats {
  totalVariants: number;
  indexedVariants: number;
  lastSync?: string;
  errors: string[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState('csv');
  const [selectedTab, setSelectedTab] = useState(0);
  const [editingWeights, setEditingWeights] = useState(false);
  const [weights, setWeights] = useState({
    color: 0.55,
    texture: 0.20,
    availability: 0.10,
    popularity: 0.10,
    capFeature: 0.05
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simple mock data for now
      setStats({
        totalVariants: 0,
        indexedVariants: 0,
        lastSync: undefined,
        errors: ['Demo mode - configure Shopify API keys for full functionality']
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setStats({
        totalVariants: 0,
        indexedVariants: 0,
        errors: ['Failed to load dashboard data']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 2000);
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setShowImportModal(false);
      setImportFile(null);
    }, 2000);
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      setImportFile(files[0]);
    }
  };

  if (loading) {
    return (
      <AppProvider i18n={{}}>
        <Page title="Chiquel Wig Matcher Dashboard">
          <Layout>
            <Layout.Section>
              <Card>
                <Box padding="400">
                  <InlineStack align="center">
                    <Spinner size="small" />
                    <Text as="span">Loading dashboard...</Text>
                  </InlineStack>
                </Box>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    );
  }

  const tabs = [
    {
      id: 'overview',
      content: 'Overview',
      accessibilityLabel: 'Dashboard overview',
      panelID: 'overview-panel'
    },
    {
      id: 'sync-logs',
      content: 'Sync & Logs',
      accessibilityLabel: 'Sync status and logs',
      panelID: 'sync-panel'
    },
    {
      id: 'color-manager',
      content: 'Color Manager',
      accessibilityLabel: 'Color family management',
      panelID: 'color-panel'
    },
    {
      id: 'weights',
      content: 'Scoring Weights',
      accessibilityLabel: 'Scoring weights configuration',
      panelID: 'weights-panel'
    }
  ];

  return (
    <AppProvider i18n={{}}>
      <Page
        title="Chiquel Wig Matcher Dashboard"
        subtitle="Manage your AI-powered wig matching system"
        primaryAction={{
          content: 'Settings',
          icon: SettingsIcon,
          onAction: () => alert('Settings functionality coming soon!')
        }}
      >
        {stats?.errors && stats.errors.length > 0 && (
          <Layout.Section>
            <Banner status="info" title="Configuration Status">
              <ul>
                {stats.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Banner>
          </Layout.Section>
        )}

        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              {/* Overview Tab */}
              {selectedTab === 0 && (
                <Box padding="400">
                  <BlockStack gap="400">
                    {/* Stats Cards */}
                    <InlineStack gap="400">
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">Product Catalog</Text>
                            <Text as="p" variant="bodyLg">{stats?.totalVariants || 0}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">Total variants indexed</Text>
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">Sync History</Text>
                            <Text as="p" variant="bodyLg">0</Text>
                            <Text as="p" variant="bodySm" tone="subdued">0 successful, 0 failed</Text>
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">Last Sync</Text>
                            <Text as="p" variant="bodyLg">Never</Text>
                            <Text as="p" variant="bodySm" tone="subdued">Status: never</Text>
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">System Health</Text>
                            <Text as="p" variant="bodyLg">0</Text>
                            <Text as="p" variant="bodySm" tone="subdued">Unresolved errors (0 webhooks processed)</Text>
                          </BlockStack>
                        </Box>
                      </Card>
                    </InlineStack>

                    {/* Actions Card */}
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingLg">Catalog Management</Text>
                          <Text as="p" tone="subdued">
                            Sync your product catalog from Shopify or import wig data from CSV files.
                          </Text>
                          
                          <Divider />
                          
                          <InlineStack gap="200">
                            <ButtonGroup>
                              <Button
                                primary
                                icon={RefreshIcon}
                                loading={syncing}
                                onClick={handleSync}
                              >
                                Sync from Shopify
                              </Button>
                              <Button
                                icon={ImportIcon}
                                onClick={() => setShowImportModal(true)}
                              >
                                Import CSV
                              </Button>
                            </ButtonGroup>
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                </Box>
              )}

              {/* Sync & Logs Tab */}
              {selectedTab === 1 && (
                <Box padding="400">
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Sync Status & Logs</Text>
                    
                    <InlineStack gap="400">
                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">Webhook Status</Text>
                            <Badge status="warning">Disabled</Badge>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Configure webhooks to enable real-time sync
                            </Text>
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="400">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">Auto Sync</Text>
                            <Badge status="info">Manual Only</Badge>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Enable auto-sync for scheduled updates
                            </Text>
                          </BlockStack>
                        </Box>
                      </Card>
                    </InlineStack>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="400">
                          <Text as="h3" variant="headingMd">Activity Log</Text>
                          <Text as="p" tone="subdued">No sync activity yet. Configure Shopify API credentials to enable syncing.</Text>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                </Box>
              )}

              {/* Color Manager Tab */}
              {selectedTab === 2 && (
                <Box padding="400">
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingLg">Color Family Manager</Text>
                      <Button primary icon={ColorIcon}>
                        Add Color Family
                      </Button>
                    </InlineStack>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="400">
                          <Text as="h3" variant="headingMd">Default Color Families</Text>
                          
                          <InlineStack gap="400">
                            <Card>
                              <Box padding="300">
                                <BlockStack gap="200">
                                  <InlineStack gap="200">
                                    <div style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      backgroundColor: '#F7E7A1',
                                      borderRadius: '4px',
                                      border: '1px solid #ddd'
                                    }} />
                                    <Text as="h4" variant="headingSm">Blonde</Text>
                                    <Badge status="success">Active</Badge>
                                  </InlineStack>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    LAB: (85, 5, 25) • Warm/Cool undertones
                                  </Text>
                                </BlockStack>
                              </Box>
                            </Card>

                            <Card>
                              <Box padding="300">
                                <BlockStack gap="200">
                                  <InlineStack gap="200">
                                    <div style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      backgroundColor: '#8B4513',
                                      borderRadius: '4px',
                                      border: '1px solid #ddd'
                                    }} />
                                    <Text as="h4" variant="headingSm">Brunette</Text>
                                    <Badge status="success">Active</Badge>
                                  </InlineStack>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    LAB: (35, 10, 20) • Warm/Cool undertones
                                  </Text>
                                </BlockStack>
                              </Box>
                            </Card>

                            <Card>
                              <Box padding="300">
                                <BlockStack gap="200">
                                  <InlineStack gap="200">
                                    <div style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      backgroundColor: '#8B0000',
                                      borderRadius: '4px',
                                      border: '1px solid #ddd'
                                    }} />
                                    <Text as="h4" variant="headingSm">Red</Text>
                                    <Badge status="success">Active</Badge>
                                  </InlineStack>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    LAB: (45, 35, 25) • Warm/Cool undertones
                                  </Text>
                                </BlockStack>
                              </Box>
                            </Card>
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                </Box>
              )}

              {/* Scoring Weights Tab */}
              {selectedTab === 3 && (
                <Box padding="400">
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingLg">Scoring Weights Configuration</Text>
                      <ButtonGroup>
                        {editingWeights ? (
                          <>
                            <Button onClick={() => setEditingWeights(false)}>
                              Cancel
                            </Button>
                            <Button primary onClick={() => {
                              setEditingWeights(false);
                              alert('Weights saved successfully!');
                            }}>
                              Save Weights
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => setEditingWeights(true)}>
                            Edit Weights
                          </Button>
                        )}
                      </ButtonGroup>
                    </InlineStack>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="400">
                          <Text as="p" tone="subdued">
                            Configure how different factors influence wig matching scores. Total must equal 100%.
                          </Text>

                          <div>
                            <Text as="label" variant="bodyMd">
                              Color Matching ({Math.round(weights.color * 100)}%)
                            </Text>
                            <Box paddingBlockStart="200">
                              <RangeSlider
                                value={weights.color * 100}
                                min={0}
                                max={100}
                                step={5}
                                disabled={!editingWeights}
                                onChange={(value) => setWeights(prev => ({ ...prev, color: value / 100 }))}
                              />
                            </Box>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Most important: ΔE color science and color family matching
                            </Text>
                          </div>

                          <div>
                            <Text as="label" variant="bodyMd">
                              Texture Matching ({Math.round(weights.texture * 100)}%)
                            </Text>
                            <Box paddingBlockStart="200">
                              <RangeSlider
                                value={weights.texture * 100}
                                min={0}
                                max={50}
                                step={5}
                                disabled={!editingWeights}
                                onChange={(value) => setWeights(prev => ({ ...prev, texture: value / 100 }))}
                              />
                            </Box>
                          </div>

                          <InlineStack gap="400">
                            <div style={{ flex: 1 }}>
                              <Text as="label" variant="bodyMd">
                                Availability ({Math.round(weights.availability * 100)}%)
                              </Text>
                              <Box paddingBlockStart="200">
                                <RangeSlider
                                  value={weights.availability * 100}
                                  min={0}
                                  max={25}
                                  step={5}
                                  disabled={!editingWeights}
                                  onChange={(value) => setWeights(prev => ({ ...prev, availability: value / 100 }))}
                                />
                              </Box>
                            </div>

                            <div style={{ flex: 1 }}>
                              <Text as="label" variant="bodyMd">
                                Popularity ({Math.round(weights.popularity * 100)}%)
                              </Text>
                              <Box paddingBlockStart="200">
                                <RangeSlider
                                  value={weights.popularity * 100}
                                  min={0}
                                  max={25}
                                  step={5}
                                  disabled={!editingWeights}
                                  onChange={(value) => setWeights(prev => ({ ...prev, popularity: value / 100 }))}
                                />
                              </Box>
                            </div>

                            <div style={{ flex: 1 }}>
                              <Text as="label" variant="bodyMd">
                                Cap Features ({Math.round(weights.capFeature * 100)}%)
                              </Text>
                              <Box paddingBlockStart="200">
                                <RangeSlider
                                  value={weights.capFeature * 100}
                                  min={0}
                                  max={15}
                                  step={1}
                                  disabled={!editingWeights}
                                  onChange={(value) => setWeights(prev => ({ ...prev, capFeature: value / 100 }))}
                                />
                              </Box>
                            </div>
                          </InlineStack>

                          <Box padding="300" background="bg-surface-secondary">
                            <Text as="p" variant="bodySm">
                              <strong>Total: {Math.round((weights.color + weights.texture + weights.availability + weights.popularity + weights.capFeature) * 100)}%</strong>
                              {Math.abs((weights.color + weights.texture + weights.availability + weights.popularity + weights.capFeature) - 1) > 0.01 && (
                                <span style={{ color: '#d72c0d', marginLeft: '0.5rem' }}>
                                  (Warning: Should total 100%)
                                </span>
                              )}
                            </Text>
                          </Box>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                </Box>
              )}
            </Tabs>
          </Layout.Section>
        </Layout>

        {/* Import Modal */}
        <Modal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Wig Catalog"
          primaryAction={{
            content: 'Import',
            loading: importing,
            disabled: !importFile,
            onAction: handleImport
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowImportModal(false)
            }
          ]}
        >
          <Modal.Section>
            <Form onSubmit={handleImport}>
              <FormLayout>
                <Select
                  label="File Format"
                  options={[
                    { label: 'CSV', value: 'csv' },
                    { label: 'JSONL', value: 'jsonl' }
                  ]}
                  value={importFormat}
                  onChange={(value) => setImportFormat(value)}
                />
                
                <div>
                  <Text as="label" htmlFor="file-input" variant="bodyMd">
                    Choose File
                  </Text>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.jsonl,.txt"
                    onChange={(e) => handleFileChange(e.target.files)}
                    style={{ 
                      marginTop: '8px', 
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                  {importFile && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </Text>
                  )}
                </div>

                <Text as="p" variant="bodySm" tone="subdued">
                  Expected CSV columns: id, title, price, length, texture, color, cap_size, 
                  cap_construction, density, hair_type, style
                </Text>
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
      </Page>
    </AppProvider>
  );
}