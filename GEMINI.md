# Multichannel Player (VAMP) - Diretrizes e Contexto do Projeto

## 📌 Visão Geral
O **Multichannel Player** (também denominado **VAMP - Virtual Arranger Multitrack Player**) é uma aplicação de palco (PWA) em **Angular**, **Tone.js** e **Dexie.js (IndexedDB)** para reprodução de *backing tracks* multicanais com arranjo interativo em tempo real, navegação por marcadores e sincronização de baixa latência em dispositivos móveis e desktops.

---

## 🧠 Base de Conhecimento Integrada (NotebookLM via MCP)

Este projeto possui um caderno dedicado no **Google NotebookLM** contendo análises de código, especificações de arquitetura, testes de latência e discussões de design.

* **Caderno:** `Multichannel Player`
* **ID do Notebook:** `176d411a-cb05-4569-bfd5-871a05386712`
* **Alias MCP:** `multichannel-player`
* **Servidor MCP:** `gemini-notebook-mcp`

### Diretrizes de Consulta para o Assistente:
1. **Consulta sob Demanda:** Ao lidar com dúvidas sobre arquitetura do motor de áudio, estratégias de latência (`lookAhead`), sincronia do `Tone.Transport`, formato dos marcadores (`maxPlays`, `nextMarker`, `referencia`), importação de pacotes ZIP/JSON ou requisitos de palco, o assistente deve consultar a base do NotebookLM via MCP (`notebook_query` no notebook `multichannel-player`).
2. **Atualização de Fontes:** Quando houver documentações ou novas decisões de arquitetura relevantes a serem preservadas, novos conteúdos ou notas podem ser adicionados ao caderno via ferramentas `source_add` e `note`.
