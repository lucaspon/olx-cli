# olx-cli

Busque anúncios do OLX Brasil direto pelo terminal. Sem navegador, sem anúncios, sem cadastro — só os resultados.

## Instalação

### Via npm (recomendado)

```bash
npm install -g olx-cli
```

### Via npx (sem instalar)

```bash
npx olx-cli search "iphone 15"
```

### Do código-fonte

```bash
git clone https://github.com/YOUR_USERNAME/olx-cli.git
cd olx-cli
npm install
npm run build
npm link
```

## Uso

```bash
olx search <query> [options]
```

### Opções

| Opção | Descrição |
|-------|-----------|
| `-u, --url <url>` | Usar uma URL de busca do OLX diretamente |
| `-c, --category <cat>` | Slug da categoria (ex: `informatica`, `imoveis`, `eletronicos`) |
| `--min-price <n>` | Preço mínimo em R$ |
| `--max-price <n>` | Preço máximo em R$ |
| `--condition <new\|used>` | Filtrar por condição |
| `--filter-substring <text>` | Excluir anúncios cujo título contenha esse texto |
| `-p, --pages <n>` | Quantidade de páginas a buscar (padrão: 1) |
| `-l, --limit <n>` | Máximo de anúncios a retornar |
| `-f, --format <format>` | Formato de saída: `table` (padrão), `json`, `csv` |
| `-s, --sort <sort>` | Ordenar por: `price-asc`, `price-desc`, `date` |

### Exemplos

**Busca básica:**
```bash
olx search "rtx 4090"
```

**Com filtros de preço:**
```bash
olx search "playstation 5" --min-price 2000 --max-price 3500 --condition used
```

**Múltiplas páginas, saída JSON:**
```bash
olx search "macbook pro" --pages 3 --format json > resultados.json
```

**Usando uma URL do OLX:**
```bash
olx search --url "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4090"
```

**Categoria + ordenado pelo mais barato:**
```bash
olx search "iphone" --category eletronicos --sort price-asc
```

**Exportar CSV:**
```bash
olx search "guitarra" --pages 2 --format csv > guitarras.csv
```

**Excluir anúncios pelo título:**
```bash
olx search "iphone 15" --filter-substring "Pro"
```

### Stats

Após toda busca `search`, o CLI exibe automaticamente um bloco de estatísticas + histograma de preços no stderr:

```
  Stats
  ──────────────────────────────────────────
  Count              20
  Min          R$ 2.852
  Median       R$ 3.875
  Mean         R$ 3.942
  Max          R$ 5.399
  StdDev         R$ 770
  ──────────────────────────────────────────

  Price Histogram
  ────────────────────────────────────────────────────────────────────────────
  R$ 2.852 – R$ 3.107    ████████████████████████████████████████████████   6 30.0%
  ...
```

## Multisearch

Compare preços entre múltiplas buscas (até 5) com tabela dinâmica e histogramas:

```bash
olx multisearch "iphone 15" "iphone 14" "iphone 13" --pages 1 --limit 10
```

Saída:
```
  ─────────────────────────────────────────────
             │ iphone 15 │ iphone 14 │ iphone 13
  ─────────────────────────────────────────────
  Count      │ 10        │ 10        │ 10
  Min        │ R$ 2.852  │ R$ 2.450  │ R$ 2.099
  Median     │ R$ 3.575  │ R$ 3.199  │ R$ 2.895
  Mean       │ R$ 3.751  │ R$ 3.234  │ R$ 2.923
  Max        │ R$ 5.399  │ R$ 4.099  │ R$ 3.699
  StdDev     │ R$ 839    │ R$ 578    │ R$ 456
  ─────────────────────────────────────────────
```

**Com filtros:**
```bash
olx multisearch "rtx 4090" "rtx 4080" "rtx 4070" --category informatica --min-price 3000
```

**Excluindo anúncios pelo título:**
```bash
olx multisearch "iphone 15" "iphone 14" --filter-substring "Pro" --limit 8
```

## Formatos de Saída

### Table (padrão)
Tabelas formatadas com bordas Unicode, cabeçalhos em cores e link clicável (🔗 Open) com a URL completa do anúncio:
```
┌────────────┬───────────┬──────────────────────────────────────────┬─────────┐
│ ID         │ Price     │ Title                                    │ Link    │
├────────────┼───────────┼──────────────────────────────────────────┼─────────┤
│ 1497028850 │ R$ 10.000 │  RTX 4090 GameRock 24GB - Placa Gamer... │ 🔗 Open │
│ 1496994255 │ R$ 15.000 │ Rtx 4090 24gb Asus tuf                   │ 🔗 Open │
│ 1496919887 │ R$ 12.100 │ Rtx 4090 gigabyte gaming oc              │ 🔗 Open │
└────────────┴───────────┴──────────────────────────────────────────┴─────────┘

Found 3 ads
```

Clique em **🔗 Open** para abrir o anúncio no navegador (funciona no iTerm2, VS Code Terminal, GNOME Terminal, etc.).

### JSON
Array formatado com os objetos de anúncio contendo `id`, `title`, `price`, `url`, `location`, `thumbnail`, `createdAt`.

### CSV
Linha de cabeçalho com `id,title,price,url,location`.

## Créditos

A técnica de scraping foi descoberta e documentada por [**Augusto Carmo**](https://github.com/carmolim) no repositório [`olx-monitor`](https://github.com/carmolim/olx-monitor). Este CLI reutiliza essas mesmas ideias numa ferramenta simples de busca pelo terminal.

## Aviso

Esta ferramenta é para uso educacional e pessoal. Respeite os termos de serviço do OLX e não sobrecarregue seus servidores.

## Licença

MIT
