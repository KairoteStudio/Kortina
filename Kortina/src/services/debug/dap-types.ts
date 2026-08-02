export interface ProtocolMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
}
export interface Request extends ProtocolMessage {
  type: 'request';
  command: string;
  arguments?: unknown;
}
export interface Response extends ProtocolMessage {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: unknown;
}
export interface Event extends ProtocolMessage {
  type: 'event';
  event: string;
  body?: unknown;
}
export type ProtocolMessageUnion = Request | Response | Event;
export interface InitializeRequestArguments {
  clientID?: string;
  clientName?: string;
  adapterID: string;
  pathFormat?: 'path' | 'uri';
  linesStartAt1?: boolean;
  columnsStartAt1?: boolean;
  supportsVariableType?: boolean;
  supportsVariablePaging?: boolean;
  supportsRunInTerminalRequest?: boolean;
  locale?: string;
}
export interface InitializeResponseBody {
  supportsConfigurationDoneRequest?: boolean;
  supportsFunctionBreakpoints?: boolean;
  supportsConditionalBreakpoints?: boolean;
  supportsHitConditionalBreakpoints?: boolean;
  supportsEvaluateForHovers?: boolean;
  exceptionBreakpointFilters?: ExceptionBreakpointsFilter[];
  supportsStepBack?: boolean;
  supportsSetVariable?: boolean;
  supportsRestartFrame?: boolean;
  supportsGotoTargetsRequest?: boolean;
  supportsStepInTargetsRequest?: boolean;
  supportsCompletionsRequest?: boolean;
  completionTriggerCharacters?: string[];
  supportsModulesRequest?: boolean;
  additionalModuleColumns?: ColumnDescriptor[];
  supportedChecksumAlgorithms?: ChecksumAlgorithm[];
  supportsRestartRequest?: boolean;
  supportsExceptionOptions?: boolean;
  supportsValueFormattingOptions?: boolean;
  supportsExceptionInfoRequest?: boolean;
  supportTerminateDebuggee?: boolean;
  supportSuspendDebuggee?: boolean;
  supportsDelayedStackTraceLoading?: boolean;
  supportsLoadedSourcesRequest?: boolean;
  supportsLogPoints?: boolean;
  supportsTerminateThreadsRequest?: boolean;
  supportsSetExpression?: boolean;
  supportsTerminateRequest?: boolean;
  supportsDataBreakpoints?: boolean;
  supportsReadMemoryRequest?: boolean;
  supportsWriteMemoryRequest?: boolean;
  supportsDisassembleRequest?: boolean;
  supportsCancelRequest?: boolean;
  supportsBreakpointLocationsRequest?: boolean;
  supportsClipboardContext?: boolean;
  supportsSteppingGranularity?: boolean;
  supportsInstructionBreakpoints?: boolean;
  supportsExceptionFilterOptions?: boolean;
  supportsSingleThreadExecutionRequests?: boolean;
}
export interface ExceptionBreakpointsFilter {
  filter: string;
  label: string;
  description?: string;
  default?: boolean;
  supportsCondition?: boolean;
  conditionDescription?: string;
}
export interface ColumnDescriptor {
  attributeName: string;
  label: string;
  format?: string;
  type?: 'string' | 'number' | 'boolean' | 'unixTimestampUTC';
  width?: number;
}
export type ChecksumAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'timestamp';
export interface StoppedEventBody {
  reason: 'step' | 'breakpoint' | 'exception' | 'pause' | 'entry' | 'goto' | 'function breakpoint' | 'data breakpoint' | 'instruction breakpoint' | string;
  description?: string;
  threadId?: number;
  preserveFocusHint?: boolean;
  text?: string;
  allThreadsStopped?: boolean;
  hitBreakpointIds?: number[];
}
export interface Thread {
  id: number;
  name: string;
}
export interface ThreadsResponseBody {
  threads: Thread[];
}
export interface StackFrame {
  id: number;
  name: string;
  source?: Source;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  canRestart?: boolean;
  instructionPointerReference?: string;
  moduleId?: number | string;
  presentationHint?: 'normal' | 'label' | 'subtle';
}
export interface Source {
  name?: string;
  path?: string;
  sourceReference?: number;
  presentationHint?: 'normal' | 'emphasize' | 'deemphasize';
  origin?: string;
  sources?: Source[];
  adapterData?: unknown;
  checksums?: Checksum[];
}
export interface Checksum {
  algorithm: ChecksumAlgorithm;
  checksum: string;
}
export interface StackTraceResponseBody {
  stackFrames: StackFrame[];
  totalFrames?: number;
}
export interface Scope {
  name: string;
  presentationHint?: 'arguments' | 'locals' | 'registers' | string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  expensive: boolean;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}
export interface ScopesResponseBody {
  scopes: Scope[];
}
export interface Variable {
  name: string;
  value: string;
  type?: string;
  presentationHint?: VariablePresentationHint;
  evaluateName?: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}
export interface VariablePresentationHint {
  kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual' | 'dataBreakpoint' | string;
  attributes?: ('static' | 'constant' | 'readOnly' | 'rawString' | 'hasObjectId' | 'canHaveObjectId' | 'hasSideEffects' | string)[];
  visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final' | string;
  lazy?: boolean;
}
export interface VariablesResponseBody {
  variables: Variable[];
}
export interface Breakpoint {
  id?: number;
  verified: boolean;
  message?: string;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  instructionReference?: string;
  offset?: number;
}
export interface BreakpointLocation {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}
export interface SetBreakpointsResponseBody {
  breakpoints: Breakpoint[];
}
export interface SetBreakpointsArguments {
  source: Source;
  breakpoints?: SourceBreakpoint[];
  lines?: number[];
  sourceModified?: boolean;
}
export interface SourceBreakpoint {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}
export interface ContinueResponseBody {
  allThreadsContinued?: boolean;
}
export interface EvaluateResponseBody {
  result: string;
  type?: string;
  presentationHint?: VariablePresentationHint;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}
export interface LaunchRequestArguments {
  noDebug?: boolean;
  __restart?: unknown;
  [key: string]: unknown;
}
export interface DebugBreakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  verified?: boolean;
  message?: string;
  adapterId?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}
export interface DebugVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  expanded?: boolean;
  children?: DebugVariable[];
}
export interface DebugStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
}
export interface DebugThread {
  id: number;
  name: string;
  stopped: boolean;
}
export type DebugStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'terminated';
export interface DebugConfiguration {
  type: string;
  name: string;
  request: 'launch' | 'attach';
  program?: string;
  cwd?: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: unknown;
}
export const DEFAULT_NODE_DEBUG_CONFIG: DebugConfiguration = {
  type: 'node',
  name: '调试当前文件',
  request: 'launch',
  program: '${file}',
  skipFiles: ['<node_internals>/**']
};