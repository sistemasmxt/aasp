-- Garante que a coluna is_admin existe na tabela profiles
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'is_admin') then
    
    alter table public.profiles 
    add column is_admin boolean default false;
  end if;
end $$;

-- Garante que a tabela messages tem todas as colunas necessárias
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references auth.users(id) on delete cascade not null,
    receiver_id uuid references auth.users(id) on delete cascade,
    content text,
    message_type text default 'text',
    is_group boolean default false,
    group_id uuid references public.groups(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Atualiza função can_message_user para ser mais robusta
create or replace function public.can_message_user(target_user_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
declare
    sender_id uuid;
    sender_admin boolean;
    receiver_admin boolean;
begin
    -- Get authenticated user ID
    sender_id := auth.uid();
    
    -- Get admin status for both users
    select is_admin into sender_admin 
    from profiles 
    where id = sender_id;
    
    select is_admin into receiver_admin 
    from profiles 
    where id = target_user_id;

    -- Debug logs
    raise notice 'Checking message permission: sender_id=%, target_user_id=%, sender_admin=%, receiver_admin=%', 
                 sender_id, target_user_id, sender_admin, receiver_admin;
    
    -- Administrators can always message each other and anyone else
    if sender_admin then
        return true;
    end if;
    
    -- Check if users are in the same group
    if exists (
        select 1 
        from group_members gm1
        join group_members gm2 on gm1.group_id = gm2.group_id
        where gm1.user_id = sender_id
        and gm2.user_id = target_user_id
    ) then
        return true;
    end if;
    
    return false;
end;
$$;

-- Recria as políticas de RLS para mensagens
drop policy if exists "Users can insert their own messages" on public.messages;
drop policy if exists "Users can view messages they sent or received" on public.messages;

create policy "Users can insert their own messages"
    on public.messages for insert
    to authenticated
    with check (
        auth.uid() = sender_id
        and (
            -- Permitir se a função can_message_user retornar true
            public.can_message_user(receiver_id)
            or
            -- Ou se for uma mensagem de grupo e o usuário for membro do grupo
            (is_group = true and exists (
                select 1 
                from group_members 
                where user_id = auth.uid() 
                and group_id = messages.group_id
            ))
        )
    );

create policy "Users can view messages they sent or received"
    on public.messages for select
    to authenticated
    using (
        auth.uid() = sender_id
        or auth.uid() = receiver_id
        or (
            is_group = true 
            and exists (
                select 1 
                from group_members 
                where user_id = auth.uid() 
                and group_id = messages.group_id
            )
        )
    );

-- Garante que a função retorna false para casos inválidos
comment on function public.can_message_user(uuid) is 
'Verifica se o usuário autenticado pode enviar mensagens para o usuário alvo.
Retorna true se:
1. O remetente é um administrador
2. Ambos os usuários estão no mesmo grupo
Retorna false em todos os outros casos.';