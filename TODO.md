# TODO - Dashboard "Alertas Recentes" - Correções Necessárias

## ✅ Funcionalidades Já Implementadas
- [x] Filtragem de alertas do dia atual (created_at >= hoje 00:00:00)
- [x] Paginação com 5 alertas por página
- [x] Botão "Resolver" para marcar alertas como atendidos
- [x] Atualização do resolved_at e is_active quando resolvido

## 🔍 Verificações Necessárias
- [ ] Verificar se a query de filtragem por data está funcionando corretamente
- [ ] Testar a paginação com mais de 5 alertas
- [ ] Confirmar se o botão "Resolver" atualiza o banco corretamente
- [ ] Verificar se os alertas resolvidos são exibidos corretamente

## 🐛 Possíveis Problemas Identificados
- A query filtra apenas alertas criados hoje, mas pode não incluir alertas "do dia" corretamente
- A paginação pode não estar sendo resetada quando novos alertas chegam
- O estado dos alertas pode não estar sendo atualizado em tempo real

## 📋 Plano de Correção
1. Ajustar a query para incluir alertas "do dia" (considerando timezone)
2. Garantir que a paginação seja resetada quando necessário
3. Melhorar o feedback visual dos alertas resolvidos
4. Testar todas as funcionalidades com dados reais
