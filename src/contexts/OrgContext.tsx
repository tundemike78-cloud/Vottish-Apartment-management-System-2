import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Organization, OrgMember } from '../lib/supabase';
import { useAuth } from './AuthContext';

type OrgContextType = {
  currentOrg: Organization | null;
  orgMember: OrgMember | null;
  organizations: Organization[];
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
  canAccess: (requiredRoles: string[]) => boolean;
};

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgMember, setOrgMember] = useState<OrgMember | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      setCurrentOrg(null);
      setOrgMember(null);
      setOrganizations([]);
      setLoading(false);
    }
  }, [user]);

  const loadOrganizations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: memberships, error } = await supabase
        .from('org_members')
        .select('*, organizations(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const orgs = memberships?.map((m: any) => m.organizations) || [];
      setOrganizations(orgs);

      const savedOrgId = localStorage.getItem('currentOrgId');
      let targetOrg = orgs.find((o: Organization) => o.id === savedOrgId) || orgs[0];

      if (targetOrg) {
        const membership = memberships?.find((m: any) => m.org_id === targetOrg.id);
        setCurrentOrg(targetOrg);
        setOrgMember(membership || null);
        localStorage.setItem('currentOrgId', targetOrg.id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrg = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', orgId);

      supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', user?.id)
        .maybeSingle()
        .then(({ data }) => setOrgMember(data));
    }
  };

  const refreshOrgs = async () => {
    await loadOrganizations();
  };

  const canAccess = (requiredRoles: string[]): boolean => {
    if (!orgMember) return false;
    return requiredRoles.includes(orgMember.role);
  };

  const value = {
    currentOrg,
    orgMember,
    organizations,
    loading,
    switchOrg,
    refreshOrgs,
    canAccess,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
