// @flow
import "rxjs/add/operator/toPromise";
import "rxjs/add/operator/first";
import { Model } from "./Model";
import { Layer } from "./Layer";
import ndarray from "ndarray";
import { axpy, cpsc } from "ndarray-blas-level1";
import { LossFunction } from "./LossFunction";
import { zeros } from "../util";
import { dotProduct } from "../ndarrayFunctions/dotProduct";
import { Optimizer } from "./Optimizer";
import R from 'ramda';

class BaseTestLayer extends Layer {
  // compileShape() {
  //   return this.inputShape
  // }

  compile() {
    return {
      permuteInput: (data: ndarray) => data,
      permuteGradient: (gradient: ndarray) => gradient,
      compileApplyOptimizer: (optimizer: Optimizer) => (gradient: ndarray) => {},
    }
  }
}

class MSE extends LossFunction {
  compile(shape: number[]) {
    const error0 = zeros(shape);
    const error1 = zeros(shape);
    return {
      d0: ({ y, yPred }: { y: ndarray, yPred: ndarray }) => {
        //noinspection JSSuspiciousNameCombination
        cpsc(-1, yPred, error0);
        //noinspection JSSuspiciousNameCombination
        axpy(1, y, error0);
        const result = dotProduct(error0, error0);
        return result;
      },
      d1: ({ y, yPred }: { y: ndarray, yPred: ndarray }) => {
        //noinspection JSSuspiciousNameCombination
        cpsc(2, yPred, error1);
        //noinspection JSSuspiciousNameCombination
        axpy(-2, y, error1);
        return error1;
      },
    }
  }
}

test('model is producing a loss', async () => {
  class NonceLayer extends BaseTestLayer {
    compile() {
      return {
        permuteInput: (data: ndarray) => data,
        permuteGradient: (gradient: ndarray) => gradient,
        compileApplyOptimizer: (optimizer: Optimizer) => (gradient: ndarray) => {},
      }
    }
  }

  const model = new Model([2])
    .pipe(new NonceLayer())
    .loss(new MSE())
    .compile();

  const promise = model.first().toPromise();

  model.next({
    x: ndarray(new Float32Array([-1, -2]), [2]),
    y: ndarray(new Float32Array([-3, -5]), [2]),
  });

  expect(await promise).toEqual(R.mean([
    Math.pow(-1 - -3, 2),
    Math.pow(-2 - -5, 2),
  ]));
});