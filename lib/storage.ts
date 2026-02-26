export interface RecentRoom {
  code: string;
  joinedAt: number;
}

const RECENT_ROOMS_KEY = 'undercover_recent_rooms';
const MAX_RECENT_ROOMS = 5;

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!data) return [];
    
    return JSON.parse(data) as RecentRoom[];
  } catch (error) {
    console.error('Error reading recent rooms from localStorage:', error);
    return [];
  }
}

export function saveRecentRoom(code: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const rooms = getRecentRooms();
    
    // Remove if already exists to move to top
    const filteredRooms = rooms.filter(r => r.code !== code);
    
    // Add to top
    filteredRooms.unshift({
      code,
      joinedAt: Date.now()
    });
    
    // Trim to max length
    const trimmedRooms = filteredRooms.slice(0, MAX_RECENT_ROOMS);
    
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(trimmedRooms));
  } catch (error) {
    console.error('Error saving recent room to localStorage:', error);
  }
}

export function clearRecentRooms(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(RECENT_ROOMS_KEY);
  } catch (error) {
    console.error('Error clearing recent rooms from localStorage:', error);
  }
}

export function removeRecentRoom(code: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const rooms = getRecentRooms();
    const filteredRooms = rooms.filter(r => r.code !== code);
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(filteredRooms));
  } catch (error) {
    console.error('Error removing recent room from localStorage:', error);
  }
}
