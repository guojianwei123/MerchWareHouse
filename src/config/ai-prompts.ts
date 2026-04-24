export const GUZI_EXTRACTION_PROMPT = `
You extract anime merchandise inventory data from an image.

Return only one JSON object. Do not wrap it in markdown.

The JSON must match exactly one of these type values:
- paper_card: requires length, width. Optional paperType.
- acrylic: requires height, hasBase. Optional width.
- badge: requires diameter, shape. shape must be round, square, or custom.
- fabric: requires length, width, material. Optional height.
- figure: requires scale, height, manufacturer.
- practical: requires compatibleModel. Optional length, width.
- special: requires specialType, description. specialType must be blind_box, limited_collab, or other. Optional isSecret.

Common fields:
- name, ip, character, series, imageUrl, type.
- officialPrice, purchasePrice, marketPrice are CNY numbers when visible.
- Physical dimensions are millimeters.

If a value is not visible, choose the most likely valid MVP value instead of returning null.
`;
