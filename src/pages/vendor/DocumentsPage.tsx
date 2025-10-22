import { useEffect, useState } from 'react';
import { FileText, Upload, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Vendor, VendorDocument } from '../../lib/supabase';

export function DocumentsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendorData) return;
      setVendor(vendorData);

      const { data: docsData, error } = await supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (doc: VendorDocument) => {
    if (doc.status === 'verified') {
      return (
        <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
          <CheckCircle className="h-4 w-4" />
          <span>Verified</span>
        </span>
      );
    }
    if (doc.status === 'expired') {
      return (
        <span className="flex items-center space-x-1 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-semibold">
          <XCircle className="h-4 w-4" />
          <span>Expired</span>
        </span>
      );
    }
    if (doc.status === 'rejected') {
      return (
        <span className="flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
          <XCircle className="h-4 w-4" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
        <Clock className="h-4 w-4" />
        <span>Pending Review</span>
      </span>
    );
  };

  const getExpiryWarning = (doc: VendorDocument) => {
    if (!doc.expires_at) return null;

    const expiryDate = new Date(doc.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <span className="text-rose-600 font-semibold">Expired {Math.abs(daysUntilExpiry)} days ago</span>;
    }
    if (daysUntilExpiry <= 7) {
      return <span className="text-rose-600 font-semibold">Expires in {daysUntilExpiry} days!</span>;
    }
    if (daysUntilExpiry <= 30) {
      return <span className="text-amber-600 font-semibold">Expires in {daysUntilExpiry} days</span>;
    }
    return <span className="text-gray-600">Expires {expiryDate.toLocaleDateString()}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Profile Required</h2>
          <p className="text-gray-600">Create a vendor profile to manage documents.</p>
        </div>
      </div>
    );
  }

  const requiredDocs = [
    { kind: 'license', title: 'Business License', description: 'Required for all vendors' },
    { kind: 'insurance', title: 'Liability Insurance', description: 'Required for all vendors' },
    { kind: 'w9', title: 'W-9 Tax Form', description: 'Required for payment processing' },
  ];

  const getDocForKind = (kind: string) => {
    return documents.find(d => d.kind === kind);
  };

  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;
  const isFullyVerified = verifiedCount >= 3 && expiredCount === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Documents & Compliance</h1>
          <p className="text-lg text-gray-600">Manage your compliance documents and verification status</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className={`px-6 py-4 ${isFullyVerified ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isFullyVerified ? (
                  <CheckCircle className="h-8 w-8 text-white" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-white" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isFullyVerified ? 'Fully Verified' : 'Verification Required'}
                  </h2>
                  <p className="text-white text-opacity-90">
                    {isFullyVerified
                      ? 'You can accept jobs on the platform'
                      : 'Complete verification to accept jobs'}
                  </p>
                </div>
              </div>
              <div className="text-white text-right">
                <p className="text-3xl font-bold">{verifiedCount}/3</p>
                <p className="text-sm text-white text-opacity-90">Verified</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Verified</p>
            <p className="text-3xl font-bold text-gray-900">{verifiedCount}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Review</p>
            <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Expired/Action Needed</p>
            <p className="text-3xl font-bold text-gray-900">{expiredCount}</p>
          </div>
        </div>

        <div className="space-y-4">
          {requiredDocs.map((reqDoc) => {
            const doc = getDocForKind(reqDoc.kind);
            return (
              <div
                key={reqDoc.kind}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{reqDoc.title}</h3>
                        {doc && getStatusBadge(doc)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{reqDoc.description}</p>
                      {doc && doc.expires_at && (
                        <p className="text-sm">{getExpiryWarning(doc)}</p>
                      )}
                    </div>
                    {doc ? (
                      <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all duration-200 shadow-lg">
                        <Upload className="h-5 w-5 inline mr-2" />
                        Re-upload
                      </button>
                    ) : (
                      <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-200 shadow-lg">
                        <Upload className="h-5 w-5 inline mr-2" />
                        Upload
                      </button>
                    )}
                  </div>

                  {doc && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File:</span>
                        <span className="font-medium text-gray-900">{doc.file_name || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uploaded:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.verified_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Verified:</span>
                          <span className="font-medium text-emerald-600">
                            {new Date(doc.verified_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {doc.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {doc.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Important Information</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• All required documents must be verified before you can accept jobs</li>
                <li>• You'll receive email reminders 30, 7, and 1 day before document expiry</li>
                <li>• Expired documents will temporarily hide you from the jobs board</li>
                <li>• Documents typically reviewed within 1-2 business days</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
