import { reportError, setErrorSink } from './reportError';

describe('reportError', () => {
  afterEach(() => {
    setErrorSink(null);
    jest.restoreAllMocks();
  });

  it('passes errors to the registered sink', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sink = jest.fn();
    setErrorSink(sink);
    const error = new Error('boom');

    reportError('homeRefresh', error);

    expect(sink).toHaveBeenCalledWith('homeRefresh', error);
  });

  it('never throws, even when the sink does', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    setErrorSink(() => {
      throw new Error('sink down');
    });

    expect(() => reportError('homeRefresh', new Error('boom'))).not.toThrow();
    expect(warn).toHaveBeenCalledWith('[tangent:errorSink]', 'sink down');
  });
});
