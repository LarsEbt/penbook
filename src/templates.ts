import { t } from './i18n';
import { App, Modal, Setting } from 'obsidian';
import { Notebook, Page, Paper, newBook, clone } from './model';
import { Renderer } from './render';
import { popover, colorPopover } from './dialogs';
import { panelHeader, segments, row, section, cards, toggle, panelIcon } from './panels';

export const paperNames=():Record<Paper,string>=>({blank:t('blank'),ruled:t('ruled'),grid:t('grid'),dots:t('dots'),cornell:t('cornell'),music:t('music_staff'),planner:t('monthly_planner'),tasks:t('task_list'),swot:t('swot_analysis'),kanban:t('kanban'),finance:t('finance_ledger')});
export const pageSizes=()=>[[t('goodnotes_default'),794,1123],['A3',1123,1587],['A4',794,1123],['A5',559,794],['A6',397,559],['A7',280,397],[t('letter'),816,1056],[t('tabloid'),1056,1632]]as const;
const covers=()=>[['plain',t('solid'),t('simple')],['ribbon',t('ribbon'),t('simple')],['minimal',t('minimal'),t('simple')],['classic',t('classic'),t('simple')],['light',t('plain'),t('simple')],['waves',t('soft_waves'),t('colorful')],['letters',t('letters'),t('colorful')],['leaves',t('leaves'),t('colorful')],['stripes',t('stripes'),t('colorful')],['grid',t('grid_2'),t('geometric')],['dots',t('dots'),t('geometric')],['angles',t('angles'),t('geometric')]]as const;
export function coverPreview(el:HTMLElement,book:Pick<Notebook,'cover'|'coverStyle'|'spineColor'>){el.addClass('pb-cover-preview');el.dataset.style=book.coverStyle??'minimal';el.style.setProperty('--pb-cover-color',book.cover);el.style.setProperty('--pb-spine-color',book.spineColor??'#292929');}
export function paperPreview(el:HTMLElement,page:Page){const canvas=el.createEl('canvas',{cls:'pb-template-paper'});canvas.width=110;canvas.height=150;const ctx=canvas.getContext('2d')!;ctx.scale(110/page.width,150/page.height);new Renderer().paper(ctx,page);}
export function sizePanel(anchor:HTMLElement,page:Page,changed:()=>void){
  popover(anchor,(panel,close)=>{const draw=()=>{panel.empty();panelHeader(panel,t('size'),close);const orientation=page.width>page.height?'landscape':'portrait';
    segments(panel,[['portrait',t('portrait')],['landscape',t('landscape')]],orientation,v=>{if(v!==orientation)[page.width,page.height]=[page.height,page.width];changed();draw();});
    const group=section(panel);for(const[name,w,h]of pageSizes())row(group,name,()=>{page.width=orientation==='portrait'?w:h;page.height=orientation==='portrait'?h:w;changed();draw();},(page.width===w&&page.height===h||page.width===h&&page.height===w)?'✓':'');
    row(group,t('custom'),()=>{panel.empty();panelHeader(panel,t('custom_size'),close,draw);let width=String(page.width),height=String(page.height);new Setting(panel).setName(t('width')).addText(t=>t.setValue(width).onChange(v=>width=v));new Setting(panel).setName(t('height')).addText(t=>t.setValue(height).onChange(v=>height=v));new Setting(panel).addButton(b=>b.setButtonText(t('ok')).setCta().onClick(()=>{const w=Number(width),h=Number(height);if(![w,h].every(n=>Number.isFinite(n)&&n>=100&&n<=4000))return;page.width=w;page.height=h;changed();close();}));});};draw();
  });
}
export function templateGallery(parent:HTMLElement,page:Page,changed:()=>void){
  for(const[category,papers]of [[t('basic'),['blank','dots','grid','ruled']],[t('writing'),['ruled','cornell','music']],[t('planning'),['planner','tasks','kanban','swot','finance']]]as[string,Paper[]][]){
    parent.createEl('h4',{cls:'pb-section-title',text:category});const strip=parent.createDiv('pb-template-strip');
    for(const paper of papers){const b=strip.createEl('button',{cls:'pb-template-card',attr:{'aria-pressed':String(page.paper===paper)}});b.dataset.paper=paper;paperPreview(b,{...page,paper});b.createSpan({text:paperNames()[paper]});b.toggleClass('is-active',page.paper===paper);b.onclick=()=>{page.paper=paper;for(const choice of parent.querySelectorAll<HTMLElement>('[data-paper]')){const selected=choice.dataset.paper===paper;choice.toggleClass('is-active',selected);choice.setAttribute('aria-pressed',String(selected));}changed();};}
  }
}
export function templatePicker(anchor:HTMLElement,page:Page,apply:(page:Page)=>void){
  const draft=clone(page);popover(anchor,(panel,close)=>{panel.addClass('pb-template-popover');panelHeader(panel,t('paper_templates'),close);templateGallery(panel,draft,()=>{apply(draft);});
    new Setting(panel).setName(t('size')).addButton(b=>b.setButtonText(`${Math.round(draft.width)} × ${Math.round(draft.height)}`).onClick(()=>sizePanel(anchor,draft,()=>apply(draft))));
    const colors=panel.createDiv('pb-paper-colors');for(const[color,name]of[['#fffef0',t('yellow')],['#ffffff',t('white')],['#202020',t('black')]]){const b=colors.createEl('button',{attr:{title:name,'aria-label':name}});b.style.background=color;b.onclick=()=>{draft.color=color;apply(draft);};}
  });
}
export function notebookWizard(app:App,paper:Paper):Promise<Notebook|null>{
  return new Promise(resolve=>{
    class Wizard extends Modal {
      book=newBook(t('untitled_notebook'),paper);tab:'cover'|'paper'='paper';done=false;
      onOpen(){this.modalEl.addClass('pb-notebook-modal');this.titleEl.setText(t('new_notebook'));this.book.cover='#ad9f88';this.book.coverStyle='minimal';this.book.hasCover=true;this.book.spineColor='#292929';this.book.language='English';this.book.pages[0].color='#fffef0';this.draw();const footer=this.modalEl.createDiv('pb-newbook-footer');new Setting(footer).addButton(b=>b.setButtonText(t('cancel')).onClick(()=>this.close())).addButton(b=>b.setButtonText(t('create_notebook')).setCta().onClick(()=>{this.done=true;resolve(this.book);this.close();}));}
      draw(){const content=this.contentEl;content.empty();const top=content.createDiv('pb-newbook-top'),previews=top.createDiv('pb-newbook-previews');
        for(const[tab,label]of[['cover',t('cover')],['paper',t('paper')]]as const){const b=previews.createEl('button',{cls:'pb-newbook-preview'});const visual=b.createDiv();if(tab==='cover')coverPreview(visual,this.book);else paperPreview(visual,this.book.pages[0]);b.createSpan({text:label});b.toggleClass('is-active',this.tab===tab);b.onclick=()=>{this.tab=tab;this.draw();};}
        const fields=top.createDiv('pb-newbook-fields');
        const field=(label:string)=>{const row=fields.createDiv('pb-newbook-field');row.createSpan({text:label});return row.createDiv('pb-newbook-control');};
        const title=field(t('name')).createEl('input',{attr:{type:'text',placeholder:t('untitled_notebook'),'aria-label':t('name')}});title.value=this.book.title===t('untitled_notebook')?'':this.book.title;title.oninput=()=>this.book.title=title.value.trim()||t('untitled_notebook');
        const language=field(t('language')).createEl('select',{attr:{'aria-label':t('language')}});for(const name of['English','简体中文','繁體中文'])language.createEl('option',{text:name,value:name});language.value=this.book.language??('English');language.onchange=()=>this.book.language=language.value;
        const cover=field(t('cover')).createEl('button',{cls:'pb-switch',attr:{role:'switch','aria-label':t('use_cover'),'aria-checked':String(this.book.hasCover!==false)}});cover.onclick=()=>{this.book.hasCover=this.book.hasCover===false;cover.setAttribute('aria-checked',String(this.book.hasCover));};
        const size=field(t('size')).createEl('button',{text:`${this.book.pages[0].width} × ${this.book.pages[0].height}`});size.onclick=()=>sizePanel(size,this.book.pages[0],()=>this.draw());
        const color=field(t('color')).createEl('button',{text:t('choose_color')});color.onclick=()=>this.colors(color);
        const gallery=content.createDiv('pb-newbook-gallery');gallery.createEl('h3',{text:this.tab==='cover'?t('cover_templates'):t('paper_templates')});
        if(this.tab==='paper')templateGallery(gallery,this.book.pages[0],()=>this.draw());else for(const category of[t('simple'),t('colorful'),t('geometric')]){gallery.createEl('h4',{cls:'pb-section-title',text:category});const strip=gallery.createDiv('pb-template-strip');for(const[style,label,group]of covers()){if(group!==category)continue;const b=strip.createEl('button',{cls:'pb-template-card'});coverPreview(b.createDiv(),{...this.book,coverStyle:style});b.createSpan({text:label});b.toggleClass('is-active',style===this.book.coverStyle);b.onclick=()=>{this.book.coverStyle=style;this.draw();};}}
      }
      colors(anchor:HTMLElement){popover(anchor,(panel,close)=>{panelHeader(panel,t('color'),close);if(this.tab==='cover'){segments(panel,[['spine',t('edit_spine')],['color',t('cover_color')]],'spine',v=>{grid(v==='spine');});}const body=panel.createDiv();const grid=(spine:boolean)=>{body.empty();cards(body,(this.tab==='paper'?['#fffef0','#ffffff','#202020']:['#292929','#315b91','#fffef0','#58816b','#ab4949','#d3b451','#ad9f88','#18233d','#eeeeee']).map(color=>({value:color,label:color,preview:el=>{const sample=el.createDiv();if(this.tab==='paper')paperPreview(sample,{...this.book.pages[0],color});else coverPreview(sample,{...this.book,spineColor:spine?color:this.book.spineColor,cover:spine?this.book.cover:color});}})),this.tab==='paper'?this.book.pages[0].color:spine?this.book.spineColor??'':this.book.cover,color=>{if(this.tab==='paper')this.book.pages[0].color=color;else if(spine)this.book.spineColor=color;else this.book.cover=color;this.draw();});};grid(this.tab==='cover');panelIcon(panel,'palette',t('custom_color'),()=>colorPopover(anchor,this.tab==='paper'?this.book.pages[0].color:this.book.cover,color=>{if(this.tab==='paper')this.book.pages[0].color=color;else this.book.cover=color;this.draw();}));});}
      onClose(){if(!this.done)resolve(null);this.contentEl.empty();}
    }
    new Wizard(app).open();
  });
}
