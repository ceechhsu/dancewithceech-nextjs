export function backDestination(screen, lessonTitle) {
  if (screen === 'lesson') return {screen: 'library', label: 'Library'};
  if (['watch', 'setup', 'take'].includes(screen)) return {screen: 'lesson', label: lessonTitle};
  return null;
}

export function lessonRoute(screen, lessonId) {
  if (screen === 'library') return '/practice/';
  const lesson = `/practice/#lesson=${encodeURIComponent(lessonId)}`;
  return screen === 'lesson' ? lesson : `${lesson}&view=${encodeURIComponent(screen)}`;
}

export class LessonNavigation {
  constructor(history,{challenge=null}={}) { this.history = history; this.current = null; this.challenge=/^[a-f0-9]{32}$/.test(challenge||'')?challenge:null; }

  route(screen,lessonId){
    if(screen==='library')this.challenge=null;
    const path=lessonRoute(screen,lessonId);
    return this.challenge?path.replace('/practice/#','/practice/?challenge='+this.challenge+'#'):path;
  }

  start(screen, lessonId = null) {
    this.current = {dwcScreen: screen, lessonId, depth: 0};
    this.history.replaceState(this.current, '', this.route(screen, lessonId));
    return this.current;
  }

  open(screen, lessonId = null, {replace = false} = {}) {
    const next = {dwcScreen: screen, lessonId: screen === 'library' ? null : lessonId,
      depth: replace ? (this.current?.depth ?? 0) : (this.current?.depth ?? 0) + 1};
    this.history[replace ? 'replaceState' : 'pushState'](next, '', this.route(screen, next.lessonId));
    this.current = next;
    return next;
  }

  back() {
    if (!this.current) return null;
    const destination = backDestination(this.current.dwcScreen, this.current.lessonId);
    if (!destination) return null;
    if (this.current.depth > 0) { this.history.back(); return null; }
    return this.open(destination.screen, this.current.lessonId, {replace: true});
  }

  restore(state) {
    this.current = state?.dwcScreen ? state : {dwcScreen: 'library', lessonId: null, depth: 0};
    return this.current;
  }
}
