export const SHORTCUTS = [
  ['select-all','sc_select_all',['Mod+A']],['deselect','sc_deselect',['Escape','Mod+Shift+A']],
  ['undo','sc_undo',['Mod+Z']],['redo','sc_redo',['Mod+Shift+Z','Mod+Y']],['save','save',['Mod+S']],
  ['copy','copy_selection',['Mod+C']],['cut','sc_cut_selection',['Mod+X']],['paste','paste_selection',['Mod+V']],['duplicate','sc_duplicate_selection',['Mod+D']],['delete','delete_selection_undoable',['Delete','Backspace']],
  ['group','group_selection',['Mod+G']],['ungroup','ungroup_selection',['Mod+Shift+G']],['lock','lock_or_unlock_selection',['Mod+L']],
  ['raise','sc_raise',['Mod+]']],['lower','sc_lower',['Mod+[']],['front','bring_to_front',['Mod+Shift+]']],['back','send_to_back',['Mod+Shift+[']],
  ['left','sc_move_left',['ArrowLeft','Shift+ArrowLeft']],['right','sc_move_right',['ArrowRight','Shift+ArrowRight']],['up','sc_move_up',['ArrowUp','Shift+ArrowUp']],['down','sc_move_down',['ArrowDown','Shift+ArrowDown']],
  ['edit','sc_edit_selection',['Enter']],['transform','rotate_scale_and_opacity',['Mod+Shift+T']],
  ['pen','sc_tool_pen',['P']],['eraser','sc_tool_eraser',['E']],['lasso','sc_tool_lasso',['L','V']],['hand','sc_tool_hand',['H']],
  ['text','sc_tool_text',['T']],['shape','sc_tool_shape',['S']],['sticky','sc_tool_sticky',['N']],['link','sc_tool_link',['K']],['table','sc_tool_table',['B']],['laser','sc_tool_laser',['I']],['tape','sc_tool_tape',['M']],
  ['thinner','sc_thinner',['[']],['thicker','sc_thicker',[']']],
  ['previous-page','previous_page',['PageUp']],['next-page','next_page',['PageDown']],['first-page','sc_first_page',['Home']],['last-page','sc_last_page',['End']],
  ['zoom-in','zoom_in',['Mod+=','Mod++']],['zoom-out','zoom_out',['Mod+-']],['zoom-reset','sc_zoom_reset',['Mod+0']],['fit','fit_width',['Mod+Shift+0']],
  ['search','search_pages_and_content',['Mod+F']],['sidebar','show_or_hide_page_list',['F9']],['immersive','immersive_mode',['Mod+Shift+F']],['reading','reading_mode',['R']],
  ['new-page','insert_page',['Mod+Shift+N']],['export-pdf','export_pdf_2',['Mod+Shift+E']],['page-link','sc_copy_page_link',[]],
] as const;
export type ShortcutAction=typeof SHORTCUTS[number][0];
export const EDIT_ACTIONS=new Set<ShortcutAction>(['cut','paste','duplicate','delete','group','ungroup','lock','raise','lower','front','back','left','right','up','down','edit','transform','new-page']);
export const SELECTION_ACTIONS=new Set<ShortcutAction>(['copy','cut','duplicate','delete','group','ungroup','lock','raise','lower','front','back','left','right','up','down','edit','transform']);
export const shortcutHint=(action:ShortcutAction)=>SHORTCUTS.find(([id])=>id===action)?.[2][0]?.replace('Mod','Ctrl/Cmd');
export function shortcutAction(e:Pick<KeyboardEvent,'key'|'code'|'ctrlKey'|'metaKey'|'shiftKey'|'altKey'|'isComposing'>):ShortcutAction|undefined{
  if(e.isComposing||e.altKey)return;
  const mod=e.ctrlKey||e.metaKey;
  // Physical punctuation codes keep shifted brackets and +/- usable on keyboards
  // where KeyboardEvent.key becomes a brace or plus sign.
  let key=e.key.length===1?e.key.toUpperCase():e.key;
  if(e.code==='BracketLeft')key='[';else if(e.code==='BracketRight')key=']';else if(e.code==='Equal')key='=';else if(e.code==='Minus')key='-';
  const chord=`${mod?'Mod+':''}${e.shiftKey?'Shift+':''}${key}`;
  for(const [id,,keys] of SHORTCUTS)if((keys as readonly string[]).includes(chord))return id;
  if(mod&&(key==='+'||key==='=')&&(e.shiftKey||key==='+'))return 'zoom-in';
}
