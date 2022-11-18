import {
  getPinyin,
  getMultipleTone,
  getPinyinWithoutTone,
  getInitialAndFinal,
  getNumOfTone,
  getPinyinWithNum,
  getFirstLetter,
  getFinalParts,
} from './handle';
import { getStringLength, isZhChar, getSplittedWord } from './utils';
import { hasCustomConfig } from './custom';

interface BasicOptions {
  /**
   * @description 返回的拼音音调类型
   * @value symbol：在字母上加音调 （默认值）
   * @value num：以数字格式展示音调，并跟在拼音后面
   * @value none：不展示音调
   */
  toneType?: 'symbol' | 'num' | 'none';
  /**
   * @description 返回的拼音格式类型
   * @value pinyin：返回完整拼音 （默认值）
   * @value initial：返回声母
   * @value final：返回韵母
   * @value num：返回音调对应的数字
   * @value first：返回首字母
   * @value finalHead：返回韵头（介音）
   * @value finalBody：返回韵腹
   * @value finalTail：返回韵尾
   */
  pattern?:
    | 'pinyin'
    | 'initial'
    | 'final'
    | 'num'
    | 'first'
    | 'finalHead'
    | 'finalBody'
    | 'finalTail';
  /**
   * @description 是否返回单个汉字的所有多音，仅针对输入的 word 为单个汉字生效
   * @value false：返回最常用的一个拼音 （默认值）
   * @value true：返回所有读音
   */
  multiple?: boolean;
  /**
   * @description 优先的拼音匹配模式
   * @value normal：正常匹配模式 （默认值）
   * @value surname：姓氏模式，遇到姓氏表中的汉字时，优先匹配姓氏读音
   */
  mode?: 'normal' | 'surname';
  /**
   * @description 是否移除非汉字字符（推荐使用 removeNonZh: removed 代替）
   * @value false：返回结果保留非汉字字符 （默认值）
   * @value true：返回结果移除非汉字字符
   */
  removeNonZh?: boolean;
  /**
   * @description 非汉字字符的间距格式
   * @value spaced：连续非汉字字符之间用空格隔开 （默认值）
   * @value consecutive：连续非汉字字符无间距
   * @value removed：返回结果移除非汉字字符
   */
  nonZh?: 'spaced' | 'consecutive' | 'removed';
  /**
   * @description 对于 ü 的返回是否转换成 v（仅在 toneType: none 启用时生效）
   * @value false：返回值中保留 ü （默认值）
   * @value true：返回值中 ü 转换成 v
   */
  v?: boolean;
}

interface AllData {
  origin: string;
  pinyin: string;
  initial: string;
  final: string;
  num: number;
  first: string;
  finalHead: string;
  finalBody: string;
  finalTail: string;
  isZh: boolean;
}

interface OptionsReturnString extends BasicOptions {
  /**
   * @description 返回结果的格式
   * @value string：以字符串格式返回，拼音之间用空格隔开 （默认值）
   * @value array：以数组格式返回
   */
  type?: 'string';
}

interface OptionsReturnArray extends BasicOptions {
  /**
   * @description 返回结果的格式
   * @value string：以字符串格式返回，拼音之间用空格隔开 （默认值）
   * @value array：以数组格式返回
   */
  type: 'array';
}

interface OptionsReturnAll extends BasicOptions {
  type: 'all';
}

interface CompleteOptions extends BasicOptions {
  /**
   * @description 返回结果的格式
   * @value string：以字符串格式返回，拼音之间用空格隔开 （默认值）
   * @value array：以数组格式返回
   */
  type?: 'string' | 'array' | 'all';
}

const DEFAULT_OPTIONS: CompleteOptions = {
  pattern: 'pinyin',
  toneType: 'symbol',
  type: 'string',
  multiple: false,
  mode: 'normal',
  removeNonZh: false,
  nonZh: 'spaced',
  v: false,
};

/**
 * @description: 获取汉语字符串的拼音
 * @param {string} word 要转换的汉语字符串
 * @param {OptionsReturnString=} options 配置项
 * @return {string | string[] | AllData[]} options.type 为 string 时，返回字符串，中间用空格隔开；为 array 时，返回拼音字符串数组；为 all 时返回全部信息的数组
 */
function pinyin(word: string, options?: OptionsReturnString): string;

/**
 * @description: 获取汉语字符串的拼音
 * @param {string} word 要转换的汉语字符串
 * @param {OptionsReturnArray=} options 配置项
 * @return {string | string[] | AllData[]} options.type 为 string 时，返回字符串，中间用空格隔开；为 array 时，返回拼音字符串数组；为 all 时返回全部信息的数组
 */
function pinyin(word: string, options?: OptionsReturnArray): string[];

/**
 * @description: 获取汉语字符串的拼音
 * @param {string} word 要转换的汉语字符串
 * @param {OptionsReturnAll=} options 配置项
 * @return {string | string[] | AllData[]} options.type 为 string 时，返回字符串，中间用空格隔开；为 array 时，返回拼音字符串数组；为 all 时返回全部信息的数组
 */
function pinyin(word: string, options?: OptionsReturnAll): AllData[];

/**
 * @description: 获取汉语字符串的拼音
 * @param {string} word 要转换的汉语字符串
 * @param {CompleteOptions=} options 配置项
 * @return {string | string[] | AllData[]} options.type 为 string 时，返回字符串，中间用空格隔开；为 array 时，返回拼音字符串数组；为 all 时返回全部信息的数组
 */
function pinyin(
  word: string,
  options = DEFAULT_OPTIONS
): string | string[] | AllData[] {
  // word传入类型错误时
  if (typeof word !== 'string') {
    return word;
  }

  let originNonZh = options.nonZh;
  if (options.removeNonZh) {
    originNonZh = 'removed';
  }
  // 针对 all 模式特殊处理
  if (options.type === 'all') {
    options.removeNonZh = false;
    options.nonZh = 'spaced';
  }

  // 如果 removeNonZh 为 true，移除非中文字符串
  if (options.removeNonZh || options.nonZh === 'removed') {
    let str = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (isZhChar(char)) {
        str += char;
      }
    }
    word = str;
  }

  // 传入空字符串
  if (word === '') {
    return options.type === 'array' || options.type === 'all' ? [] : '';
  }

  let pinyin = '';
  if (options.removeNonZh || options.nonZh === 'removed') {
    pinyin = getPinyin(word, getStringLength(word), {
      mode: options.mode || 'normal',
      nonZh: options.nonZh,
      useCustomConfig: hasCustomConfig(),
    });
  } else {
    // 针对双精度unicode编码字符处理
    let i = 0;
    let lastIndex = 0;
    let items: {
      val: string;
      isDouble: boolean;
      firstNonZh?: boolean;
      lastNonZh?: boolean;
    }[] = [];
    while (i < word.length) {
      const currentWord = word.substring(i, i + 2);
      if (getStringLength(currentWord) !== currentWord.length) {
        // 双精度unicode编码字符
        if (lastIndex !== i) {
          const leftWord = word.substring(lastIndex, i);
          const leftPinyin = getPinyin(leftWord, getStringLength(leftWord), {
            mode: options.mode || 'normal',
            nonZh: options.nonZh || 'spaced',
            useCustomConfig: hasCustomConfig(),
          });
          items.push({
            val: leftPinyin,
            isDouble: false,
            firstNonZh: !isZhChar(leftWord[0]),
            lastNonZh: !isZhChar(leftWord[leftWord.length - 1]),
          });
        }
        items.push({ val: currentWord, isDouble: true });
        lastIndex = i + 2;
        i = i + 2;
      } else {
        i++;
      }
    }
    if (lastIndex !== i) {
      const remainedWord = word.substring(lastIndex, i);
      const remainedPinyin = getPinyin(
        remainedWord,
        getStringLength(remainedWord),
        {
          mode: options.mode || 'normal',
          nonZh: options.nonZh || 'spaced',
          useCustomConfig: hasCustomConfig(),
        }
      );
      items.push({
        val: remainedPinyin,
        isDouble: false,
        firstNonZh: !isZhChar(remainedWord[0]),
        lastNonZh: !isZhChar(remainedWord[remainedWord.length - 1]),
      });
    }

    if (options.nonZh === 'consecutive') {
      for (let i = 0; i < items.length; i++) {
        if (i === 0) {
          pinyin += items[0].val;
        } else {
          // 当前字符起始是否为非中文
          const currentNonZh = items[i].isDouble || items[i].firstNonZh;
          // 上一个字符结束是否为非中文
          const preNonZh = items[i - 1].isDouble || items[i - 1].lastNonZh;
          pinyin =
            pinyin + (currentNonZh && preNonZh ? '' : ' ') + items[i].val;
        }
      }
    } else {
      pinyin = items.map((item) => item.val).join(' ');
    }
  }

  // 对multiple进行处理
  if (getStringLength(word) === 1 && options.multiple) {
    pinyin = getMultipleTone(word);
  }

  const originPinyin = pinyin;

  // pattern参数处理
  switch (options.pattern) {
    case 'pinyin':
      break;
    case 'num':
      const numOfTone = getNumOfTone(pinyin);
      return options.type === 'array' ? numOfTone.split(' ') : numOfTone;
    case 'initial':
      pinyin = getInitialAndFinal(pinyin).initial;
      break;
    case 'final':
      pinyin = getInitialAndFinal(pinyin).final;
      break;
    case 'first':
      pinyin = getFirstLetter(pinyin);
      break;
    case 'finalHead':
      pinyin = getFinalParts(pinyin).head;
      break;
    case 'finalBody':
      pinyin = getFinalParts(pinyin).body;
      break;
    case 'finalTail':
      pinyin = getFinalParts(pinyin).tail;
      break;
    default:
      break;
  }

  if (options.type === 'all') {
    const origins = getSplittedWord(word);
    const list = pinyin.split(' ').map((p, index) =>
      isZhChar(origins[index])
        ? {
            origin: origins[index],
            pinyin: p,
            initial: allMiddleWare(
              getInitialAndFinal(p).initial,
              originPinyin,
              options
            ),
            final: allMiddleWare(
              getInitialAndFinal(p).final,
              originPinyin,
              options
            ),
            first: allMiddleWare(getFirstLetter(p), originPinyin, options),
            finalHead: allMiddleWare(
              getFinalParts(p).head,
              originPinyin,
              options
            ),
            finalBody: allMiddleWare(
              getFinalParts(p).body,
              originPinyin,
              options
            ),
            finalTail: allMiddleWare(
              getFinalParts(p).tail,
              originPinyin,
              options
            ),
            num: Number(getNumOfTone(p)),
            isZh: p !== origins[index],
          }
        : {
            origin: origins[index],
            pinyin: '',
            initial: '',
            final: '',
            first: '',
            finalHead: '',
            finalBody: '',
            finalTail: '',
            num: 0,
            isZh: false,
          }
    );
    if (originNonZh === 'removed') {
      return list.filter((pinyin) => pinyin.isZh);
    } else if (originNonZh === 'consecutive') {
      const result = [];
      for (let i = 0; i < list.length; i++) {
        const pinyin = list[i];
        if (pinyin.isZh) {
          result.push(pinyin);
        } else if (i > 0 && !list[i - 1].isZh) {
          result[result.length - 1].origin += pinyin.origin;
        } else {
          result.push(pinyin);
        }
      }
      return result;
    } else {
      return list;
    }
  }

  // toneType参数处理
  pinyin = toneTypeMiddleware(pinyin, originPinyin, options);

  // v参数处理
  pinyin = vMiddleWare(pinyin, options);

  // type 参数处理
  return options.type === 'array' ? pinyin.split(' ') : pinyin;
}

const toneTypeMiddleware = (
  pinyin: string,
  origin: string,
  options: CompleteOptions
): string => {
  switch (options.toneType) {
    case 'symbol':
      break;
    case 'none':
      pinyin = getPinyinWithoutTone(pinyin);
      break;
    case 'num': {
      pinyin = getPinyinWithNum(pinyin, origin);
      break;
    }
    default:
      break;
  }
  return pinyin;
};

const vMiddleWare = (pinyin: string, options: CompleteOptions) => {
  if (options.v) {
    pinyin = pinyin.replace(/ü/g, 'v');
  }
  return pinyin;
};

// all 格式处理
const allMiddleWare = (
  pinyin: string,
  origin: string,
  options: CompleteOptions
): string => {
  pinyin = toneTypeMiddleware(pinyin, origin, options);
  pinyin = vMiddleWare(pinyin, options);
  return pinyin;
};

export { pinyin };
