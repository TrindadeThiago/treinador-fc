# Specification Quality Checklist: Captação de jovens

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Sem perguntas ao usuário:** os pontos abertos do prompt têm padrão razoável, registrado em Assumptions:
  - a captação depende do departamento aberto;
  - as datas são a abertura das janelas;
  - a quantidade e o custo vêm por nível e tamanho da região.
- **Limite de estrangeiros:** o prompt pedia o limite na entrada. A spec aplica o limite também na promoção (FR-008), porque hoje a promoção não confere estrangeiros (todos os jovens da safra são do país). Isso só afeta os captados estrangeiros.
- **"Sem passar da academia nível 5 sozinha"** (prompt) virou um critério medível no SC-004: a força e o potencial médios dos captados ficam no máximo nos da safra nível 5.
- **Linguagem técnica:** as menções a seed, save, mod e `mod-format.md` seguem o padrão das specs 036 a 039 (princípios II, III e VI).
