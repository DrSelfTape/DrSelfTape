export const AuditionsColumnData = [
  { name: 'title', title: 'Title' },
  { name: 'project_name', title: 'Project Name' },
  { name: 'role_name', title: 'Role Name' },
  { name: 'Status', title: 'Status' },
  { name: 'action', title: 'Action' },
];

export const AuditionsRowData = [
  {
    id: 1,
    auditionId: 'AUD005',
    title: 'solo drama 2',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
  {
    id: 2,
    auditionId: 'AUD0054',
    title: 'solo drama 3',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
];

export const AuditionsColumnExtensionsData = [
  { columnName: 'title', width: 80 },
  { columnName: 'project_name', width: 80 },
  { columnName: 'role_name', width: 50 },
  { columnName: 'Status', width: 50 },
  { columnName: 'action', width: 50 },
  
];

export const castingAuditionsColumnData = [
  { name: 'title', title: 'Project' },
  { name: 'description', title: 'Description' },
  { name: 'status', title: 'Status' },
  { name: 'action', title: 'Action' },
];

export const castingAuditionsRowData = [
  {
    id: 1,
    auditionId: 'AUD005',
    title: 'solo drama 2',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
  {
    id: 2,
    auditionId: 'AUD0054',
    title: 'solo drama 3',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
];

export const castingAuditionsColumnExtensionsData = [
  { columnName: 'auditionId', width: 100 },
  { columnName: 'title', width: 150 },
  { columnName: 'role_info', width: 120 },
  { columnName: 'status', width: 100 },
  { columnName: 'deadline', width: 120 },
];

export const openAuditionColumnData = [
  { name: 'title', title: 'Project' },
  { name: 'description', title: 'Description' },
  { name: 'status', title: 'Status' },
  { name: 'action', title: 'Action' },
];

export const openAuditionRowData = [
  {
    id: 1,
    auditionId: 'AUD005',
    title: 'solo drama 2',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
  {
    id: 2,
    auditionId: 'AUD0054',
    title: 'solo drama 3',
    description: 'demo description for solo drama 2',
    role_info: 'Actor will act solo 2',
    deadline: '2025-07-24T13:41:00',
    status: 'open',
    attachments: 'file',
  },
];

export const openAuditionColumnExtensionsData = [
  { columnName: 'auditionId', width: 100 },
  { columnName: 'title', width: 150 },
  { columnName: 'role_info', width: 120 },
  { columnName: 'status', width: 100 },
  { columnName: 'deadline', width: 120 },
];
export const ActorBookingColumnData = [
  { name: 'audition', title: 'Audition' },
  { name: 'location', title: 'Location' },
  { name: 'type', title: 'Type' },
  { name: 'status', title: 'Status' },
  { name: 'action', title: 'Action' },
];
export const ActorBookingEditColumnData = [
  { name: 'location', title: 'Location' },
  { name: 'type', title: 'Type' },
];

export const ActorBookingRowData = [
  {
    audition: 1,
    location: 'London',
    type: 'self_tape',
    status: 'scheduled',
  },
  {
    audition: 2,
    location: 'England',
    type: 'rehearsal',
    status: 'completed',
  },
  {
    audition: 3,
    location: 'Birmingham',
    type: 'canceled',
    status: 'canceled',
  },
];

export const ActorBookingColumnExtensionsData = [
  { columnName: 'audition', width: 100 },
  { columnName: 'location', width: 120 },
  { columnName: 'type', width: 120 },
  { columnName: 'status', width: 120 },
];
