# Fast Freelancer - TODO

## Fase 1: Banco de Dados e Schema

- [ ] Criar schema Drizzle com todas as tabelas (users, worker_profiles, client_profiles, specialties, availability, service_requests, reviews, service_history)
- [ ] Gerar migrações SQL via drizzle-kit
- [ ] Executar migrações no banco de dados
- [ ] Criar query helpers em server/db.ts

## Fase 2: Backend - Procedures tRPC

- [ ] Implementar procedures de autenticação (me, logout)
- [ ] Implementar procedures de perfil (updateWorkerProfile, updateClientProfile, getProfile)
- [ ] Implementar procedures de especialidades (listSpecialties)
- [ ] Implementar procedures de busca (searchWorkers, getWorkersByLocation)
- [ ] Implementar procedures de disponibilidade (updateAvailability, getAvailability)
- [ ] Implementar procedures de solicitações (createServiceRequest, listServiceRequests, acceptServiceRequest, rejectServiceRequest)
- [ ] Implementar procedures de status (updateServiceStatus, getServiceStatus)
- [ ] Implementar procedures de avaliações (createReview, getReviews, getWorkerRating)
- [ ] Implementar procedures de histórico (getServiceHistory, getClientHistory, getWorkerHistory)
- [ ] Escrever testes Vitest para todos os procedures

## Fase 3: Frontend - Layout e Navegação

- [ ] Configurar tema visual (paleta de cores, tipografia)
- [ ] Criar layout base com navegação
- [ ] Implementar DashboardLayout para clientes e trabalhadores
- [ ] Criar página de onboarding/role selection
- [ ] Implementar autenticação e redirecionamento baseado em role

## Fase 4: Frontend - Perfis de Usuário

- [ ] Criar página de perfil do trabalhador (edição)
- [ ] Implementar upload de foto (S3)
- [ ] Criar seletor de especialidades
- [ ] Criar página de perfil do cliente (edição)
- [ ] Implementar validação de formulários

## Fase 5: Frontend - Busca e Filtragem

- [ ] Criar página de busca de trabalhadores
- [ ] Implementar filtros (especialidade, localização, disponibilidade, rating)
- [ ] Criar componente de lista de trabalhadores
- [ ] Implementar ordenação por proximidade e rating
- [ ] Adicionar paginação

## Fase 6: Frontend - Mapa Interativo

- [ ] Integrar Google Maps API
- [ ] Criar componente de mapa com marcadores
- [ ] Implementar busca de localização do cliente
- [ ] Adicionar marcadores de trabalhadores disponíveis
- [ ] Implementar filtro de raio de distância no mapa

## Fase 7: Frontend - Solicitações de Serviço

- [ ] Criar formulário de solicitação de serviço
- [ ] Implementar seletor de urgência
- [ ] Criar modal de confirmação
- [ ] Implementar notificação de sucesso
- [ ] Criar página de solicitações recebidas (trabalhador)
- [ ] Implementar botões de aceitar/recusar

## Fase 8: Frontend - Acompanhamento em Tempo Real

- [ ] Criar componente de status do serviço
- [ ] Implementar atualização de status (in_progress, completed)
- [ ] Adicionar timeline visual de progresso
- [ ] Implementar notificações em tempo real (tRPC subscriptions ou WebSocket)
- [ ] Criar página de acompanhamento para cliente

## Fase 9: Frontend - Avaliações e Histórico

- [ ] Criar formulário de avaliação (stars + comentário)
- [ ] Implementar página de histórico de serviços
- [ ] Criar componente de card de serviço histórico
- [ ] Implementar filtros de histórico (data, status)
- [ ] Adicionar estatísticas de rating

## Fase 10: Testes e Otimizações

- [ ] Escrever testes de integração
- [ ] Otimizar queries do banco de dados
- [ ] Implementar caching
- [ ] Testar responsividade mobile
- [ ] Testar performance do mapa
- [ ] Validar acessibilidade (WCAG)

## Fase 11: Entrega Final

- [ ] Revisar design visual
- [ ] Criar checkpoint final
- [ ] Documentar API
- [ ] Preparar guia de uso
- [ ] Entregar projeto ao usuário
