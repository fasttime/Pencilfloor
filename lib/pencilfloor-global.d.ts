import Pencilfloor from './pencilfloor';

type PencilfloorConstructor = Pencilfloor;

declare global { let Pencilfloor: PencilfloorConstructor; }

export default Pencilfloor;
export * from './pencilfloor';
