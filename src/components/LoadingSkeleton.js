import React from 'react';
import './LoadingSkeleton.css';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => (
  <div 
    className={`skeleton-box ${className}`}
    style={{ width, height, borderRadius }}
  />
);

export const SkeletonCircle = ({ size = '40px', className = '' }) => (
  <div 
    className={`skeleton-circle ${className}`}
    style={{ width: size, height: size }}
  />
);

export const SkeletonText = ({ lines = 1, gap = '8px' }) => (
  <div className="skeleton-text" style={{ gap }}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBox
        key={i}
        width={i === lines - 1 ? '70%' : '100%'}
        height="16px"
      />
    ))}
  </div>
);

export const FileUploadSkeleton = () => (
  <div className="skeleton-file-upload">
    <div className="skeleton-upload-area">
      <SkeletonCircle size="60px" />
      <SkeletonText lines={2} />
    </div>
  </div>
);

export const ConversionCardSkeleton = () => (
  <div className="skeleton-conversion-card">
    <div className="skeleton-card-header">
      <SkeletonCircle size="48px" />
      <div className="skeleton-card-info">
        <SkeletonBox width="150px" height="20px" />
        <SkeletonBox width="100px" height="14px" />
      </div>
    </div>
    <SkeletonBox height="4px" borderRadius="2px" />
    <div className="skeleton-card-actions">
      <SkeletonBox width="100px" height="36px" borderRadius="8px" />
      <SkeletonBox width="100px" height="36px" borderRadius="8px" />
    </div>
  </div>
);

export const AdminDashboardSkeleton = () => (
  <div className="skeleton-admin-dashboard">
    <div className="skeleton-stats-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <SkeletonBox width="60px" height="20px" />
          <SkeletonBox width="120px" height="32px" />
        </div>
      ))}
    </div>
    <div className="skeleton-chart">
      <SkeletonBox height="300px" borderRadius="12px" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBox key={i} height="20px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <SkeletonBox key={colIdx} height="16px" />
        ))}
      </div>
    ))}
  </div>
);

const LoadingSkeleton = ({ type = 'box', ...props }) => {
  const components = {
    box: SkeletonBox,
    circle: SkeletonCircle,
    text: SkeletonText,
    fileUpload: FileUploadSkeleton,
    conversionCard: ConversionCardSkeleton,
    adminDashboard: AdminDashboardSkeleton,
    table: TableSkeleton,
  };

  const Component = components[type] || SkeletonBox;
  return <Component {...props} />;
};

export default LoadingSkeleton;
