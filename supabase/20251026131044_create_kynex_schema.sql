-- USERS (profiles)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique not null,
  preferences jsonb default jsonb_build_object(
    'notifications_enabled', true,
    'email_notifications', false,
    'browser_notifications', true,
    'theme', 'dark'
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONVERSATIONS
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text default 'New Conversation',
  team_id text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MESSAGES
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- NOTES
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  content text,
  tags text[] default '{}',
  folder text,
  attachments jsonb default '[]'::jsonb, -- stores array of attachments as JSON
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REMINDERS
create table if not exists reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  reminder_type text check (reminder_type in ('personal', 'professional')) not null,
  due_date timestamptz not null,
  is_completed boolean default false,
  is_recurring boolean default false,
  recurrence_rule text null,
  notification_sent boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz null
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notes enable row level security;
alter table reminders enable row level security;

-- Basic RLS policies
create policy "Users can read and update their own profiles"
  on profiles for all
  using (auth.uid() = id);

create policy "Users can manage their own conversations"
  on conversations for all
  using (auth.uid() = user_id);

create policy "Users can manage their own messages"
  on messages for all
  using (auth.uid() = user_id);

create policy "Users can manage their own notes"
  on notes for all
  using (auth.uid() = user_id);

create policy "Users can manage their own reminders"
  on reminders for all
  using (auth.uid() = user_id);

-- TEAMS
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- TEAM MEMBERS
create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

-- TEAM CHATS
create table if not exists team_messages (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  message text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- TEAM POLICIES
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_messages enable row level security;

-- RLS Policies
create policy "Users can view teams they are members of"
  on teams for select
  using (id in (select team_id from team_members where user_id = auth.uid()));

create policy "Team owners and admins can update or delete their teams"
  on teams for all
  using (auth.uid() in (select user_id from team_members where team_id = id and role in ('owner', 'admin')));

create policy "Users can manage their own team membership"
  on team_members for all
  using (auth.uid() = user_id);

create policy "Users can send and read messages in their teams"
  on team_messages for all
  using (team_id in (select team_id from team_members where user_id = auth.uid()));

