import { PropertyGalleryGrid } from '../../components/property/PropertyGalleryGrid';

interface DashboardPageProps {
  onPropertyClick: (propertyId: string) => void;
}

export function DashboardPage({ onPropertyClick }: DashboardPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-600 mt-1">Manage your property portfolio</p>
      </div>

      <PropertyGalleryGrid onPropertyClick={onPropertyClick} />
    </div>
  );
}
