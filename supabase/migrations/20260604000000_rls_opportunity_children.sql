-- Migration: RLS policies for opportunity-child tables (fixes check-38 38c)
-- All four tables own through opportunity_id -> opportunities.created_by

-- 1. document_embeddings
drop policy if exists "own_via_opp_all" on public.document_embeddings;
create policy "own_via_opp_all" on public.document_embeddings
  for all
  using (exists (select 1 from public.opportunities o
                 where o.id = document_embeddings.opportunity_id and o.created_by = auth.uid()))
  with check (exists (select 1 from public.opportunities o
                 where o.id = document_embeddings.opportunity_id and o.created_by = auth.uid()));

-- 2. investment_memorandums
drop policy if exists "own_via_opp_all" on public.investment_memorandums;
create policy "own_via_opp_all" on public.investment_memorandums
  for all
  using (exists (select 1 from public.opportunities o
                 where o.id = investment_memorandums.opportunity_id and o.created_by = auth.uid()))
  with check (exists (select 1 from public.opportunities o
                 where o.id = investment_memorandums.opportunity_id and o.created_by = auth.uid()));

-- 3. opportunity_financials
drop policy if exists "own_via_opp_all" on public.opportunity_financials;
create policy "own_via_opp_all" on public.opportunity_financials
  for all
  using (exists (select 1 from public.opportunities o
                 where o.id = opportunity_financials.opportunity_id and o.created_by = auth.uid()))
  with check (exists (select 1 from public.opportunities o
                 where o.id = opportunity_financials.opportunity_id and o.created_by = auth.uid()));

-- 4. voice_transcripts
drop policy if exists "own_via_opp_all" on public.voice_transcripts;
create policy "own_via_opp_all" on public.voice_transcripts
  for all
  using (exists (select 1 from public.opportunities o
                 where o.id = voice_transcripts.opportunity_id and o.created_by = auth.uid()))
  with check (exists (select 1 from public.opportunities o
                 where o.id = voice_transcripts.opportunity_id and o.created_by = auth.uid()));