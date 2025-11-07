-- Função para verificar se um usuário pode enviar mensagem para outro
create or replace function public.can_message_user(target_user_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
declare
  sender_id uuid;
begin
  -- Pega o ID do usuário autenticado
  sender_id := auth.uid();
  
  -- Verifica se ambos os usuários existem e estão ativos
  return exists (
    select 1 
    from profiles sender
    join profiles receiver on true
    where sender.id = sender_id 
    and receiver.id = target_user_id
    and (
      -- Permite mensagens entre administradores
      (sender.is_admin = true and receiver.is_admin = true)
      -- Ou do administrador para qualquer usuário
      or (sender.is_admin = true)
      -- Ou entre usuários do mesmo grupo
      or exists (
        select 1 
        from group_members gm1
        join group_members gm2 on gm1.group_id = gm2.group_id
        where gm1.user_id = sender_id
        and gm2.user_id = target_user_id
      )
    )
  );
end;
$$;

-- Permissões para a função
grant execute on function public.can_message_user(uuid) to authenticated;

-- RLS para tabela de mensagens
alter table public.messages enable row level security;

create policy "Users can insert their own messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and public.can_message_user(receiver_id)
  );

create policy "Users can view messages they sent or received"
  on public.messages for select
  to authenticated
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  );