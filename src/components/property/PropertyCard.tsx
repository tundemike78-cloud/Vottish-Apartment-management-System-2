import { Building2, AlertCircle, Users, Wrench, Package } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Property } from '../../lib/supabase';

interface PropertyStats {
  openWorkOrders: number;
  slaAtRisk: number;
  visitorsToday: number;
  gasOrdersThisMonth: number;
  totalUnits: number;
  occupiedUnits: number;
}

interface PropertyCardProps {
  property: Property;
  stats?: PropertyStats;
  onClick: () => void;
}

export function PropertyCard({ property, stats, onClick }: PropertyCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-16 h-16 rounded-lg ${getAvatarColor(property.name)} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-white text-xl font-bold">
            {getInitials(property.name)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {property.name}
              </h3>
              <p className="text-sm text-gray-600 truncate">{property.address}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {property.type === 'apartment' && (
                <Badge variant="default">Apartment</Badge>
              )}
              {property.type === 'estate' && (
                <Badge variant="default">Estate</Badge>
              )}
            </div>
          </div>

          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Work Orders</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats.openWorkOrders}
                    {stats.slaAtRisk > 0 && (
                      <span className="text-red-600 ml-1">
                        ({stats.slaAtRisk} at risk)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Occupancy</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats.occupiedUnits}/{stats.totalUnits}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Visitors Today</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats.visitorsToday}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Gas Orders</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats.gasOrdersThisMonth}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
