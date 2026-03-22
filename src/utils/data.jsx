import {
  SettingsIcon,
  SubscriptionIcon,
  ChargeIcon,
  BillingIcon,
} from '../assets/icons';

export const data = {
  stats: [
    {
      name: 'Total Bookings',
      amount: '312',
      percentage: 4.5,
      metrics: 10,
    },
    {
      name: 'New Members',
      amount: '1,245',
      percentage: 3.2,
      metrics: 15,
    },
    {
      name: 'Active Subscriptions',
      amount: '896',
      percentage: -1.8,
      metrics: -5,
    },
    {
      name: 'Engagement Rate',
      amount: '72.4%',
      percentage: 2.7,
      metrics: 8,
    },
    {
      name: 'Total Revenue',
      amount: '$12,345.67',
      percentage: 5.1,
      metrics: 20,
    },
  ],
  quickActions: [
    { name: 'Invoice', link: '#', icon: '#' },
    { name: 'Estimate', link: '#', icon: '#' },
    { name: 'Credit memo', link: '#', icon: '#' },
    { name: 'Client', link: '#', icon: '#' },
    { name: 'Item', link: '#', icon: '#' },
  ],
  accountActions: [
    { name: 'Profile', link: '#', icon: <SettingsIcon active={true} /> },
    { name: 'Subscription', link: '#', icon: <SubscriptionIcon /> },
    { name: 'Billing', link: '#', icon: <BillingIcon /> },
    { name: 'Change Password', link: '#', icon: <ChargeIcon /> },
  ],
  latestInvoices: [
    { title: "Harry's INV-3", amount: '$10,000.00', timeStamp: '3 days ago' },
    { title: "Harry's INV-3", amount: '$10,000.00', timeStamp: '4 days ago' },
    { title: "Harry's INV-3", amount: '$10,000.00', timeStamp: '5 days ago' },
  ],
  invoicesOverview: [
    { name: 'Draft', color: 'bg-neutral-1300', value: 12 },
    { name: 'Sent', color: 'bg-blue-900', value: 1 },
    { name: 'Open', color: 'bg-teal-300', value: 2 },
    { name: 'Paid', color: 'bg-green-500', value: 2 },
  ],
  estimatesOverview: [
    { name: 'Draft', color: 'bg-neutral-1300', value: 12 },
    { name: 'Sent', color: 'bg-blue-900', value: 1 },
    { name: 'Open', color: 'bg-teal-300', value: 2 },
    { name: 'Approved', color: 'bg-neutral-500', value: 5 },
    { name: 'Rejected', color: 'bg-red-500', value: 2 },
  ],
  overviews: [
    { title: 'Estimates', value: 4 },
    { title: 'Invoices', value: 10 },
    { title: 'Clients', value: 12 },
  ],
};

export const castingData = [
  {
    name: 'Emma Johnson',
    location: 'Downtown LA',
    time: '10:00 AM',
    type: 'Commercial',
    castingDirector: 'John Smith',
  },
  {
    name: 'Michael Chen',
    location: 'Downtown LA',
    time: '1:30 PM',
    type: 'TV Drama',
    castingDirector: 'Sarah Lee',
  },
  {
    name: 'Sofia Rodriguez',
    location: 'Downtown LA',
    time: '4:00 PM',
    type: 'Film',
    castingDirector: 'Emily Davis',
  },
  {
    name: 'James Carter',
    location: 'Hollywood',
    time: '9:00 AM',
    type: 'Commercial',
    castingDirector: 'Amy White',
  },
  {
    name: 'Liam Wright',
    location: 'Hollywood',
    time: '12:00 PM',
    type: 'TV Drama',
    castingDirector: 'Thomas Brown',
  },
  {
    name: 'Olivia Green',
    location: 'Hollywood',
    time: '3:30 PM',
    type: 'Film',
    castingDirector: 'Grace Hall',
  },
  {
    name: 'Noah Martinez',
    location: 'Santa Monica',
    time: '11:00 AM',
    type: 'Commercial',
    castingDirector: 'Paul Walker',
  },
  {
    name: 'Ava Davis',
    location: 'Santa Monica',
    time: '2:00 PM',
    type: 'TV Drama',
    castingDirector: 'Natalie King',
  },
  {
    name: 'Isabella Lee',
    location: 'Santa Monica',
    time: '5:00 PM',
    type: 'Film',
    castingDirector: 'Justin Moore',
  },
  {
    name: 'Lucas Thompson',
    location: 'Downtown LA',
    time: '6:30 PM',
    type: 'Commercial',
    castingDirector: 'Rachel Adams',
  },
];

export function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export const defaultScriptData = {
  title: '',
  scene: '',
  scriptLines: [
    {
      character: 'ALEX',
      active: false,
      line: "I didn't think you'd actually come.",
    },
    {
      character: 'JAMIE',
      active: true,
      line: "I almost didn't. (beat) But I needed to see you one last time.",
    },
    {
      character: 'ALEX',
      active: false,
      line: "One last time? So you're really leaving tomorrow?",
    },
    {
      character: 'JAMIE',
      active: false,
      line: "The flight's at 8 AM. I've already packed everything.",
      tip: 'Try emphasizing "already packed" to show your commitment to leaving',
    },
    {
      character: 'ALEX',
      active: false,
      line: "And there's nothing I can say to change your mind?",
    },
    {
      character: 'JAMIE',
      active: false,
      line: "Alex... we've been over this a hundred times.",
    },
    {
      character: 'ALEX',
      active: false,
      line: 'I know, I know. I just... I thought we had more time.',
    },
    {
      character: 'JAMIE',
      active: false,
      line: "Sometimes life doesn't give us the time we need. (pause) But that doesn't mean what we had wasn't real.",
    },
    {
      character: 'ALEX',
      active: false,
      line: 'Real enough to walk away from?',
    },
    {
      character: 'JAMIE',
      active: false,
      line: 'Real enough to hurt this much.',
    },
  ],
  characterOptions: [
    { label: 'Alex', value: 'ALEX' },
    { label: 'Jamie', value: 'JAMIE' },
  ],
};

export const toneOptions = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Emotional', value: 'emotional' },
  { label: 'Intense', value: 'intense' },
  { label: 'Casual', value: 'casual' },
];

export const speedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2x', value: 2.0 },
];
