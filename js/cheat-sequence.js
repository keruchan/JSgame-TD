// Five title clicks, one Score click, one final title click. Any other click resets.
export class CheatSequence {
  constructor() {
    this.step = 0;
  }
  press(target) {
    if (this.step < 5 && target === 'title') {
      this.step++;
      return false;
    }
    if (this.step === 5 && target === 'score') {
      this.step = 6;
      return false;
    }
    if (this.step === 6 && target === 'title') {
      this.step = 0;
      return true;
    }
    this.step = target === 'title' ? 1 : 0;
    return false;
  }
}
