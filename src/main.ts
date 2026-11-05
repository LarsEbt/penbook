import { t } from './i18n';
import { Plugin, PluginSettingTab, Setting, Notice, TFile, normalizePath, Menu, Modal } from 'obsidian';
import { newBook, newPage, Notebook, Paper, Pen, InkProfile, clone, parseBook } from './model';
import { notebookWizard, paperNames, coverPreview } from './templates';
import { PRESET_COLORS } from './palette';
import { form, pickFile } from './dialogs';
import { PenbookView, VIEW_TYPE } from './view';
import { icon, registerIcons } from './icons';
import { installTooltips } from './tooltips';
import { SHORTCUTS, shortcutHint } from './shortcuts';
import { resolveFolders } from './folders';
import { SelectionClipboard } from './selection-clipboard';

export interface Preferences {
  folder:string; paper:Paper; penColor:string; penWidth:number; pressure:number; fingerInk:boolean;
  leftHanded:boolean; toolbarBottom:boolean; exportFolder:string; templateFolder:string; exportScale:number; eraser:'stroke'|'pixel';
  customColors:string[];presetColors:string[];
  colorHistory:string[]; inkProfiles:Partial<Record<Pen,InkProfile>>; eraserPrecision:'fine'|'standard'; eraserOnly:'all'|'highlighter'|'tape'; eraserAutoPrevious:boolean;
  penEnabled:boolean; scrollDirection:'vertical'|'horizontal'; showResolved:boolean;
}
export const DEFAULTS:Preferences={folder:'',paper:'ruled',penColor:'#000000',penWidth:3,pressure:1,fingerInk:false,leftHanded:false,toolbarBottom:false,exportFolder:'',templateFolder:'',exportScale:1.5,eraser:'stroke',customColors:[],presetColors:PRESET_COLORS,colorHistory:[],inkProfiles:{},eraserPrecision:'standard',eraserOnly:'all',eraserAutoPrevious:false,penEnabled:true,scrollDirection:'vertical',showResolved:false};

export default class PenbookPlugin extends Plugin {
  settings:Preferences={...DEFAULTS};
  selectionClipboard:SelectionClipboard|null=null;
  /** New installs get localized folder names; vaults that already use the original Chinese folders keep them. */
  private async initFolders(saved:Partial<Preferences>){
    const {settings,changed}=await resolveFolders(saved,path=>this.app.vault.adapter.exists(normalizePath(path)),{folder:t('default_folder'),exportFolder:t('export_subfolder'),templateFolder:t('template_subfolder')});
    Object.assign(this.settings,settings);
    if(changed)await this.saveSettings();
  }
  async onload(){
    registerIcons();
    this.register(installTooltips());
    const saved=(await this.loadData()??{}) as Partial<Preferences>;
    this.settings={...DEFAULTS,...saved};
    await this.initFolders(saved);
    this.settings.presetColors=[...new Set([...this.settings.presetColors,...this.settings.customColors])];this.settings.inkProfiles={...this.settings.inkProfiles};this.settings.colorHistory=[...this.settings.colorHistory];
    this.registerView(VIEW_TYPE,leaf=>new PenbookView(leaf,this));this.registerExtensions(['penbook'],VIEW_TYPE);
    this.addRibbonIcon('pb-pen',t('new_handwriting_notebook'),()=>void this.createNotebook());
    this.addCommand({id:'new-notebook',name:t('new_handwriting_notebook'),callback:()=>void this.createNotebook()});
    this.addCommand({id:'library',name:t('notebook_library'),callback:()=>new Library(this).open()});
    this.addCommand({id:'import-pdf',name:t('create_notebook_from_pdf'),callback:()=>void this.fromPdf()});
    for(const [id,labelKey] of SHORTCUTS){
      const hint=shortcutHint(id),label=t(labelKey),name=hint?`${label} (${hint})`:label;
      this.addCommand({id,name,checkCallback:checking=>{const v=this.app.workspace.getActiveViewOfType(PenbookView),target=document.activeElement?.closest('.prompt')?null:document.activeElement;if(!v||!v.canShortcut(id,target))return false;if(!checking)void v.executeShortcut(id,false,target).catch(error=>{console.error('Penbook',error);new Notice(String(error));});return true;}});
    }
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{
      if(file instanceof TFile && file.extension==='pdf')menu.addItem(i=>i.setTitle(t('annotate_pdf_with_penbook')).setIcon('pb-pen').onClick(()=>void this.fromPdf(file)));
      if(file instanceof TFile && file.extension==='penbook')menu.addItem(i=>i.setTitle(t('duplicate_notebook')).setIcon('pb-copy').onClick(()=>void this.duplicate(file)));
    }));
    this.registerObsidianProtocolHandler('penbook',async params=>{
      if(params.vault&&params.vault!==this.app.vault.getName())return;
      const file=this.app.vault.getAbstractFileByPath(normalizePath(params.file??''));if(!(file instanceof TFile)||file.extension!=='penbook')return;
      const leaf=this.app.workspace.getLeaf(false);await leaf.openFile(file);
      if(leaf.view instanceof PenbookView)leaf.view.goToId(params.page??'');
    });
    this.registerMarkdownCodeBlockProcessor('penbook',async(source,el,ctx)=>{
      const [path,pageId]=source.trim().split('#');const file=this.app.metadataCache.getFirstLinkpathDest(path,ctx.sourcePath);
      if(!file||file.extension!=='penbook'){el.setText(t('penbook_notebook_not_found'));return;}
      try{const book=parseBook(await this.app.vault.read(file)),page=book.pages.find(p=>p.id===pageId)??book.pages[0];
        const button=el.createEl('button',{text:`${book.title} · ${page.title||t('page_n',[book.pages.indexOf(page)+1])}`});icon(button,'notebook');
        button.onclick=async()=>{const leaf=this.app.workspace.getLeaf(false);await leaf.openFile(file);if(leaf.view instanceof PenbookView)leaf.view.goToId(page.id);};
        const cached=this.app.vault.getAbstractFileByPath(`${file.parent?.path??''}/${file.basename}.preview.png`);if(cached instanceof TFile)el.createEl('img',{attr:{src:this.app.vault.getResourcePath(cached),alt:book.title}});
      }catch{el.setText(t('cannot_read_penbook_file'));}
    });
    this.addSettingTab(new PenbookSettings(this));
  }
  asset(path:string){const url=this.app.vault.adapter.getResourcePath(normalizePath(`${this.app.vault.configDir}/plugins/${this.manifest.id}/${path}`));return path.endsWith('/')?url.split('?')[0].replace(/\/?$/,'/'):url;}
  async saveSettings(){await this.saveData(this.settings);}
  async folder(path:string){const p=normalizePath(path);if(p&&p!== '/'&&!await this.app.vault.adapter.exists(p))await this.app.vault.createFolder(p);return p==='/'?'':p;}
  async unique(path:string){let p=normalizePath(path),i=1;const dot=p.lastIndexOf('.');while(await this.app.vault.adapter.exists(p)){p=`${path.slice(0,dot)} ${i++}${path.slice(dot)}`;}return p;}
  async writeBinary(name:string,bytes:Uint8Array){
    const base=await this.folder(`${this.settings.folder}/${this.settings.exportFolder}`),path=await this.unique(`${base}/${name}`);
    const data=new Uint8Array(bytes).buffer;await this.app.vault.createBinary(path,data);new Notice(t('saved_n',[path]));return path;
  }
  async createNotebook(title?:string,book?:Notebook){
    if(!title){const draft=await notebookWizard(this.app,this.settings.paper);if(!draft)return;book=draft;title=draft.title;}
    const safe=title.replace(/[\\/:*?"<>|#\[\]]/g,'-'),folder=await this.folder(this.settings.folder);
    const path=await this.unique(`${folder?folder+'/':''}${safe}.penbook`);const file=await this.app.vault.create(path,JSON.stringify(book??newBook(title,this.settings.paper)));
    const leaf=this.app.workspace.getLeaf(false);await leaf.openFile(file);return leaf.view instanceof PenbookView?leaf.view:undefined;
  }
  async duplicate(file:TFile){const b=parseBook(await this.app.vault.read(file));b.title+=t('copy');b.created=new Date().toISOString();await this.createNotebook(b.title,b);}
  async fromPdf(file?:TFile){const pdf=file??await pickFile(this.app,f=>f.extension==='pdf',t('choose_a_pdf_from_the_vault'));if(!pdf)return;const view=await this.createNotebook(pdf.basename);if(view)await view.importVaultFile(pdf,true);}
}
export const PAPERS=paperNames;

class Library extends Modal {
  constructor(private plugin:PenbookPlugin){super(plugin.app);}
  async onOpen(){
    this.titleEl.setText(t('penbook_notebooks'));const search=this.contentEl.createEl('input',{attr:{placeholder:t('search_names_tags_page_content'),type:'search'}});search.addClass('pb-library-search');
    const list=this.contentEl.createDiv('pb-library');const entries: {file:TFile;book:Notebook}[]=[];
    for(const file of this.app.vault.getFiles().filter(f=>f.extension==='penbook').sort((a,b)=>b.stat.mtime-a.stat.mtime)){try{entries.push({file,book:parseBook(await this.app.vault.read(file))});}catch{/* Invalid files remain available in the vault. */}}
    const draw=()=>{list.empty();const query=search.value.toLowerCase();for(const {file,book} of entries){if(query&&!`${book.title} ${book.tags.join(' ')} ${book.pages.map(p=>p.title+' '+p.tags.join(' ')+' '+p.pdfText+' '+p.ocr+' '+p.items.map(o=>o.text??'').join(' ')).join(' ')}`.toLowerCase().includes(query))continue;
      const card=list.createEl('button',{cls:'pb-library-card'});const cover=card.createDiv({cls:'pb-book-cover'});if(book.hasCover!==false)coverPreview(cover,book);else cover.style.background=book.pages[0].color;card.createEl('strong',{text:book.title});card.createEl('small',{text:t('n_pages_n',[book.pages.length,file.path])});card.onclick=async()=>{this.close();await this.app.workspace.getLeaf(false).openFile(file);};}
      if(!list.children.length)list.createEl('p',{text:t('no_matching_notebooks_use_the_pen_button')});
    };search.oninput=draw;draw();
  }
}
class PenbookSettings extends PluginSettingTab {
  constructor(private plugin:PenbookPlugin){super(plugin.app,plugin);}
  display(){const el=this.containerEl;el.empty();new Setting(el).setName(t('penbook_handwriting')).setHeading();
    new Setting(el).setName(t('new_notebook_folder')).setDesc(t('folder_desc')).addText(x=>x.setValue(this.plugin.settings.folder).onChange(async v=>{this.plugin.settings.folder=normalizePath(v||t('default_folder'));await this.plugin.saveSettings();}));
    new Setting(el).setName(t('export_folder_name')).setDesc(t('export_folder_desc')).addText(x=>x.setValue(this.plugin.settings.exportFolder).onChange(async v=>{this.plugin.settings.exportFolder=normalizePath(v||t('export_subfolder'));await this.plugin.saveSettings();}));
    new Setting(el).setName(t('template_folder_name')).setDesc(t('template_folder_desc')).addText(x=>x.setValue(this.plugin.settings.templateFolder).onChange(async v=>{this.plugin.settings.templateFolder=normalizePath(v||t('template_subfolder'));await this.plugin.saveSettings();}));
    new Setting(el).setName(t('default_paper')).addDropdown(d=>d.addOptions(PAPERS()).setValue(this.plugin.settings.paper).onChange(async v=>{this.plugin.settings.paper=v as Paper;await this.plugin.saveSettings();}));
    new Setting(el).setName(t('default_ink_color')).addColorPicker(c=>c.setValue(this.plugin.settings.penColor).onChange(async v=>{this.plugin.settings.penColor=v;await this.plugin.saveSettings();}));
    new Setting(el).setName(t('default_pen_width')).addSlider(s=>s.setLimits(1,20,1).setValue(this.plugin.settings.penWidth).setDynamicTooltip().onChange(async v=>{this.plugin.settings.penWidth=v;await this.plugin.saveSettings();}));
    new Setting(el).setName(t('pressure_response')).setDesc(t('below_1_a_light_touch_draws_thicker_abov')).addSlider(s=>s.setLimits(.3,2,.1).setValue(this.plugin.settings.pressure).setDynamicTooltip().onChange(async v=>{this.plugin.settings.pressure=v;await this.plugin.saveSettings();}));
    for(const [key,name,desc] of [['fingerInk',t('allow_finger_writing'),t('when_off_fingers_only_pan_and_pinch_zoom')],['leftHanded',t('left_handed_layout'),t('place_page_navigation_on_the_right')],['toolbarBottom',t('toolbar_at_bottom'),t('suits_tablets_in_landscape')]] as const)new Setting(el).setName(name).setDesc(desc).addToggle(t=>t.setValue(this.plugin.settings[key]).onChange(async v=>{this.plugin.settings[key]=v;await this.plugin.saveSettings();}));
    new Setting(el).setName(t('canvas_shortcuts')).setHeading();
    el.createEl('p',{text:t('shortcuts_only_apply_inside_the_penbook')});
    const shortcuts=el.createEl('table'),head=shortcuts.createEl('thead').createEl('tr');head.createEl('th',{text:t('action')});head.createEl('th',{text:t('default_keys')});const body=shortcuts.createEl('tbody');for(const [,name,keys]of SHORTCUTS){const row=body.createEl('tr');row.createEl('td',{text:t(name)});row.createEl('td',{text:keys.join(' / ')||t('bind_in_hotkey_settings')});}
    el.createEl('p',{text:t('arrow_keys_move_1_px_shift_arrow_keys_mo')});
    el.createEl('p',{text:t('fully_local_at_runtime_ocr_handwriting_t')});
  }
}
