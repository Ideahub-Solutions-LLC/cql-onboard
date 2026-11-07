const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
const allExtensions = ['pdf', ...imageExtensions, 'csv', 'tsv', 'xls', 'xlsx', 'doc', 'docx', 'txt'];
/** @type {Record<string, {extensions:string[], description:string}>} */
const categories = {
  'Logo Square/Portrait': {extensions:imageExtensions, description:'PNG, JPG, or WebP images'},
  'Logo Landscape': {extensions:imageExtensions, description:'PNG, JPG, or WebP images'},
  Contacts: {extensions:['csv', 'tsv', 'xls', 'xlsx'], description:'CSV, TSV, or Excel files'},
  'Follow-up SOP': {extensions:['pdf', 'doc', 'docx', 'txt'], description:'PDF, Word, or text files'},
};
/** @param {string} category */
export function uploadAccept(category) {
  return (categories[category]?.extensions || allExtensions).map(extension=>'.'+extension).join(',');
}
/** @param {{name:string, size:number}[]} files @param {string} category */
export function uploadError(files, category) {
  if(!files.length) return 'Choose one or more files to upload.';
  const extensions=categories[category]?.extensions || allExtensions;
  for(const file of files) {
    if(!file.size) return `${file.name} is empty. Choose a file with content.`;
    if(file.size>10*1024*1024) return `${file.name} is larger than 10 MB. Choose files up to 10 MB each.`;
    if(!extensions.includes(file.name.split('.').pop()?.toLowerCase() || '')) return `For ${category}, choose ${categories[category]?.description || 'PDF, image, CSV, Excel, Word, or text files'}. Check ${file.name}.`;
  }
  return null;
}
