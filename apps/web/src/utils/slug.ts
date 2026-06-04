export function getSchoolSlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.host; 
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');
  
  if (parts.length > 2) {
    return parts[0];
  } else if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return localStorage.getItem('x-school-slug');
}
