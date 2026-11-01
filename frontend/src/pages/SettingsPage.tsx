import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api';
import {
  Settings,
  Mail,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Key,
  Server
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Email provider states
  const [activeTab, setActiveTab] = useState<'ai' | 'email' | 'eval'>('ai');
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'microsoft365'>('gmail');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [mailboxEmail, setMailboxEmail] = useState('');

  // AI model states
  const [fireworksModel, setFireworksModel] = useState('');
  const [fireworksApiKey, setFireworksApiKey] = useState('');

  // Evaluation results
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Handle OAuth code return from Google / Microsoft
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state') || 'gmail';
    if (code) {
      connectEmailMutation.mutate({
        provider: state,
        auth_code: code,
        redirect_uri: window.location.origin + '/settings',
      });
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const { data: aiSettings, refetch: refetchAi } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => settingsApi.getAiSettings(),
    select: (data) => {
      if (!fireworksModel && data.model) {
        setFireworksModel(data.model);
      }
      return data;
    },
  });

  const { data: emailConfigs, refetch: refetchEmail } = useQuery({
    queryKey: ['email-provider-settings'],
    queryFn: () => settingsApi.getEmailProviders(),
  });

  const updateAiMutation = useMutation({
    mutationFn: settingsApi.updateAiSettings,
    onSuccess: () => {
      refetchAi();
      alert('Fireworks AI configuration updated successfully.');
    },
    onError: (err: any) => {
      alert(`Update failed: ${err.message}`);
    },
  });

  const connectEmailMutation = useMutation({
    mutationFn: settingsApi.connectEmailProvider,
    onSuccess: () => {
      refetchEmail();
      alert('Email provider configuration updated successfully.');
    },
    onError: (err: any) => {
      alert(`Connection failed: ${err.message}`);
    },
  });

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await settingsApi.runEvaluation();
      setEvalResult(res);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    updateAiMutation.mutate({
      model: fireworksModel,
      api_key: fireworksApiKey || undefined,
    });
  };

  const handleSaveEmailProvider = (e: React.FormEvent) => {
    e.preventDefault();
    connectEmailMutation.mutate({
      provider: selectedProvider,
      client_id: clientId || undefined,
      client_secret: clientSecret || undefined,
      tenant_id: tenantId || undefined,
      mailbox_email: mailboxEmail || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Integrations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Fireworks AI extraction, email provider credentials, and run automated evaluation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ai'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Fireworks AI Config</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'email'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Mailbox Provider</span>
        </button>

        <button
          onClick={() => setActiveTab('eval')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'eval'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Model Benchmark Suite</span>
        </button>
      </div>

      {/* Tab 1: AI Config */}
      {activeTab === 'ai' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fireworks AI Model Configuration</h3>
              <p className="text-slate-500 mt-0.5">
                Instruction-following model for structured JSON issue extraction
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Status:</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {aiSettings?.has_api_key ? 'Connected with Custom Key' : 'Active (Deterministic + Ready for Key)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveAi} className="space-y-4 max-w-xl">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Inference Model Identifier</label>
              <input
                type="text"
                value={fireworksModel}
                onChange={(e) => setFireworksModel(e.target.value)}
                placeholder="accounts/fireworks/models/qwen2p5-72b-instruct"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default: <code className="bg-slate-100 px-1 py-0.5 rounded">accounts/fireworks/models/qwen2p5-72b-instruct</code>. Fully configurable without codebase modification.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fireworks API Key</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={fireworksApiKey}
                  onChange={(e) => setFireworksApiKey(e.target.value)}
                  placeholder={aiSettings?.has_api_key ? '••••••••••••••••••••••••' : 'Paste fw_... key here'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Stored strictly server-side. Never exposed to browser or recorded in logs.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updateAiMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
              >
                {updateAiMutation.isPending ? 'Saving...' : 'Save AI Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Email Provider Config */}
      {activeTab === 'email' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Mailbox Adapter</h3>
              <p className="text-slate-500 mt-0.5">
                Support mailbox credentials for manual on-demand synchronization
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setSelectedProvider('gmail')}
              className={`p-4 rounded-xl border text-left flex-1 cursor-pointer transition-all ${
                selectedProvider === 'gmail'
                  ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">Google Gmail</span>
                {emailConfigs?.gmail?.has_credentials && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">Connected</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">OAuth2 Read-only Mailbox Access</p>
            </button>

            <button
              onClick={() => setSelectedProvider('microsoft365')}
              className={`p-4 rounded-xl border text-left flex-1 cursor-pointer transition-all ${
                selectedProvider === 'microsoft365'
                  ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">Microsoft 365</span>
                {emailConfigs?.microsoft365?.has_credentials && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">Connected</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Microsoft Graph API Mail.Read</p>
            </button>
          </div>

          <form onSubmit={handleSaveEmailProvider} className="space-y-4 max-w-xl">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mailbox Support Email</label>
              <input
                type="email"
                value={mailboxEmail}
                onChange={(e) => setMailboxEmail(e.target.value)}
                placeholder="e.g. iga_support@licindia.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">OAuth Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Paste OAuth Client ID"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">OAuth Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Paste OAuth Client Secret"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {selectedProvider === 'microsoft365' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tenant ID (Directory ID)</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="e.g. common or GUID"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={connectEmailMutation.isPending}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow-xs"
              >
                {connectEmailMutation.isPending ? 'Saving...' : 'Save Credentials'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await settingsApi.getAuthUrl(selectedProvider);
                    if (res.auth_url) {
                      window.location.href = res.auth_url;
                    } else {
                      alert('Please save Client ID and Secret first before authorizing.');
                    }
                  } catch (e: any) {
                    alert('Error getting authorization URL: ' + e.message);
                  }
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Connect & Authorize {selectedProvider === 'gmail' ? 'Google Mailbox' : 'Microsoft Mailbox'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Model Evaluation Suite */}
      {activeTab === 'eval' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Automated Reference Evaluation Suite</h3>
              <p className="text-slate-500 mt-0.5">
                Tests extraction against the authentic PDF conversations (Examples 1, 2, 3)
              </p>
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isEvaluating ? 'Executing Tests...' : 'Run Benchmark Evaluation'}</span>
            </button>
          </div>

          {evalResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px]">SR No Accuracy</span>
                  <p className="text-lg font-bold text-teal-700 mt-0.5">
                    {Math.round(evalResult.sr_accuracy * 100)}%
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px]">Category Accuracy</span>
                  <p className="text-lg font-bold text-teal-700 mt-0.5">
                    {Math.round(evalResult.category_accuracy * 100)}%
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px]">Status Assessment</span>
                  <p className="text-lg font-bold text-teal-700 mt-0.5">
                    {Math.round(evalResult.status_accuracy * 100)}%
                  </p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 text-[11px] font-semibold">Overall Composite</span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">
                    {Math.round(evalResult.overall_accuracy * 100)}%
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Reference Email Example</th>
                      <th className="p-3">Extracted SR No</th>
                      <th className="p-3">Assigned Category</th>
                      <th className="p-3">Resolution Status</th>
                      <th className="p-3">Review Flag</th>
                      <th className="p-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evalResult.details?.map((d: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-medium font-mono text-[11px]">{d.thread_id}</td>
                        <td className="p-3 font-mono">{d.user_sr_no?.extracted}</td>
                        <td className="p-3">{d.category?.extracted}</td>
                        <td className="p-3 font-semibold text-slate-700">{d.status?.extracted}</td>
                        <td className="p-3">{d.needs_review?.extracted ? 'Flagged' : 'Auto-Passed'}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PASSED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

