import { t } from './i18n';
import { popover, colorControl } from './dialogs';
import { panelHeader, segments, panelIcon } from './panels';
import { UI_ICONS, pathIcon, icon } from './icons';
export const PRESET_COLORS=['#000000','#626262','#969696','#d1d1d1','#ffffff','#7b2a90','#bf261c','#e46966','#ed9fa2','#e69b32','#3478ed','#224985','#2f6c58','#93c747','#fcff9b'];
interface PaletteOptions {title?:string;value:string;presets:string[];history:string[];choose:(color:string)=>void;save:()=>void;eyedropper?:()=>void}
export function inkPalette(anchor:HTMLElement,options:PaletteOptions){
  popover(anchor,(panel,close)=>{panel.addClass('pb-palette-panel');let tab:'preset'|'custom'|'history'='preset',editing=false,current=options.value;
    const choose=(color:string)=>{current=color;options.value=color;options.history.splice(0,options.history.length,...[color,...options.history.filter(c=>c!==color)].slice(0,24));options.choose(color);options.save();draw();};
    const draw=()=>{panel.empty();const header=panelHeader(panel,options.title??t('pen_color'),close);const edit=header.createEl('button',{text:editing?t('done'):t('edit'),cls:'pb-text-button'});edit.onclick=()=>{editing=!editing;draw();};
      segments(panel,[['preset',t('presets')],['custom',t('custom')],['history',t('history')]],tab,t=>{tab=t;draw();});
      if(tab==='custom'){
        const grid=panel.createDiv('pb-color-matrix');for(let y=0;y<10;y++)for(let x=0;x<12;x++){const color=x===0?`hsl(0 0% ${y*100/9}%)`:`hsl(${(x-1)*360/11} ${Math.max(18,100-y*8)}% ${10+y*8.7}%)`;const b=grid.createEl('button',{attr:{title:color,'aria-label':color}});b.style.background=color;b.onclick=()=>{const ctx=document.createElement('canvas').getContext('2d')!;ctx.fillStyle=color;current=String(ctx.fillStyle);choose(current);};}
        colorControl(panel,current,c=>current=c);const actions=panel.createDiv('pb-palette-actions');panelIcon(actions,'plus',t('add_to_presets'),()=>{if(!options.presets.includes(current))options.presets.push(current);options.save();tab='preset';draw();});const use=actions.createEl('button',{cls:'mod-cta',text:t('use_this_color')});use.onclick=()=>choose(current);
      }else{const grid=panel.createDiv('pb-palette-grid'),colors=tab==='history'?options.history:options.presets;
        for(const color of colors){const b=grid.createEl('button',{cls:'pb-palette-swatch',attr:{title:editing?t('remove_preset_n',[color]):color,'aria-label':editing?t('remove_preset_n',[color]):color}});b.style.background=color;b.toggleClass('is-active',color.toLowerCase()===options.value.toLowerCase());if(editing)icon(b,'minus',18);else if(color.toLowerCase()===options.value.toLowerCase())pathIcon(b,UI_ICONS.check,18);b.onclick=()=>{if(editing&&tab==='preset'){options.presets.splice(options.presets.indexOf(color),1);options.save();draw();}else choose(color);};}
        if(!colors.length)grid.createEl('p',{text:t('no_color_history_yet')});if(tab==='preset')panelIcon(grid,'plus',t('add_color'),()=>{tab='custom';draw();});}
      if(options.eyedropper){const b=panel.createEl('button',{cls:'pb-panel-icon pb-eyedropper',attr:{title:t('pick_color_from_page'),'aria-label':t('pick_color_from_page')}});pathIcon(b,UI_ICONS.eyedropper);b.onclick=()=>{close();options.eyedropper?.();};}
    };draw();
  });
}
