export const getTypeColor = (type: string) => {
  switch(type.toLowerCase()) {
    case 'number': return '#D97706'; // Amber (LabVIEW DBL style)
    case 'boolean': return '#388E3C'; // Green
    case 'string': return '#F9A825'; // Yellow
    case 'array': return '#E65100'; // Orange
    default: return '#9E9E9E'; // Gray
  }
};

export const getNodeColor = (category: string) => {
  switch(category.toLowerCase()) {
    case 'source': return '#388E3C';
    case 'math': return '#1565C0';
    case 'logic': return '#6A1B9A';
    case 'sink': return '#E65100';
    case 'io': return '#1565C0';
    default: return '#546E7A';
  }
};
