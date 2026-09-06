function tableLabel(header: string): string {
  return header
    .replace(/<[^>]*>/g, "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .trim();
}

export function addResponsiveTableLabels(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (table) => {
    const headers = [...table.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map((match) =>
      tableLabel(match[1])
    );

    if (headers.length === 0) return table;

    return table.replace(/<tbody>([\s\S]*?)<\/tbody>/g, (_bodyMatch, body) => {
      const labeledRows = body.replace(/<tr>([\s\S]*?)<\/tr>/g, (_rowMatch: string, row: string) => {
        let column = 0;
        const labeledCells = row.replace(/<td>/g, () => {
          const label = headers[column] ?? "";
          column += 1;
          return `<td data-label="${label}">`;
        });
        return `<tr>${labeledCells}</tr>`;
      });

      return `<tbody>${labeledRows}</tbody>`;
    });
  });
}
