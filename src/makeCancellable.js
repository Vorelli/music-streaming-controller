export default function makeCancellable(promise) {
  let hasCanceled_ = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      (val) => (hasCanceled_ ? reject(new Error('cancelled')) : resolve(val)),
      (error) => (hasCanceled_ ? reject(new Error('cancelled')) : reject(error))
    );
  });

  return {
    promise: wrappedPromise,
    cancel() {
      hasCanceled_ = true;
    }
  };
}
