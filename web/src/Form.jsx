/* global localStorage */
import React, { useState, useReducer, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import keycode from 'keycode';
import jsonp from 'jsonp';

import { Button } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

import { pageToBbsCode } from '@html2nga/hots-transform';

const LS_KEY_LAST_URL = 'hots-patchnote-transform/last-url';

function transform(s, { url, doTranslate }) {
  return pageToBbsCode(
    {
      htmlText: s,
      url,
    },
    {
      doTranslate,
    },
  );
}

const formBodyClasses = {
  optionSection: {
    display: 'flex',
    margin: 10,
  },

  leftOption: {
    flex: 1,
  },

  rightOption: {
    flex: '0 0 auto',
  },

  textFieldTransformedInput: {
    maxHeight: '20em',
  },

  textFieldTransformed: {
  },

  errorSection: {
    backgroundColor: '#f00',
    color: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 10,
  },
};

const loaderInitState = {
  loading: false,
  error: null,
  raw: null,
  contentUrl: null,
  taskId: 0,
};

function loaderReducer(state, action) {
  switch (action.type) {
  case 'START':
    return {
      ...state,
      loading: true,
      error: null,
      raw: null,
      contentUrl: action.url,
      taskId: action.taskId,
    };

  case 'ERROR':
    if (action.taskId !== state.taskId) {
      console.warn('TaskId unmatched', action.taskId, state.taskId);
      return state;
    }
    return {
      ...state,
      loading: false,
      error: action.error,
      raw: null,
      contentUrl: null,
    };

  case 'RESOLVE':
    if (action.taskId !== state.taskId) {
      console.warn('TaskId unmatched', action.taskId, state.taskId);
      return state;
    }
    return {
      ...state,
      loading: false,
      error: null,
      raw: action.result,
    };

  case 'CLEAR_ERROR':
    if (action.taskId !== state.taskId) {
      console.warn('TaskId unmatched', action.taskId, state.taskId);
      return state;
    }
    return {
      ...state,
      error: null,
    };

  default:
    return state;
  }
}

function assertValidUrl() {

}

function constructProxyUrl(url) {
  return `http://www.whateverorigin.org/get?url=${encodeURIComponent(url)}`;
}

async function fetchWithJsonp(url, options) {
  return new Promise((resolve, reject) => {
    jsonp(url, options, (e, d) => {
      if (e) {
        reject(e);
      } else {
        resolve(d);
      }
    });
  });
}

function _FormBody({ classes }) {
  const [url, changeUrl] = useState(localStorage.getItem(LS_KEY_LAST_URL) || '');
  const [doTranslate, changeDoTranslate] = useState(true);
  const [loaderState, loaderDispatch] = useReducer(
    loaderReducer,
    loaderInitState,
  );
  const transformedRef = useRef(null);
  const rememberLastUrl = useCallback(_.throttle(
    (lastUrl) => {
      localStorage.setItem(LS_KEY_LAST_URL, lastUrl);
    },
    500,
    { leading: false, trailing: true },
  ));

  const transformedValue = useMemo(
    () => loaderState.raw ? transform(
      loaderState.raw,
      {
        url: loaderState.contentUrl,
        doTranslate,
      },
    ) : '',
    [loaderState.raw, loaderState.contentUrl, doTranslate],
  );

  async function start() {
    const myTaskId = loaderState.taskId + 1;
    loaderDispatch({
      type: 'START',
      url,
      taskId: myTaskId,
    });

    try {
      assertValidUrl(url);
      const proxyUrl = constructProxyUrl(url);
      const response = await fetchWithJsonp(proxyUrl);
      loaderDispatch({
        type: 'RESOLVE',
        result: response.contents,
        taskId: myTaskId,
      });
    } catch (e) {
      loaderDispatch({
        type: 'ERROR',
        error: e,
        taskId: myTaskId,
      });
    }
  }

  return (
    <Grid item xs={12}>
      <TextField
        key="url"
        inputProps={{
          className: classes.urlTextfieldInput,
        }}
        className={classes.urlTextfield}
        fullWidth
        label="更新日志URL"
        placeholder="例如：https://heroesofthestorm.com/en-us/blog/..."
        value={url}
        onChange={(evt) => {
          changeUrl(evt.target.value);
          rememberLastUrl(evt.target.value);
        }}
        onKeyDown={(evt) => {
          if (keycode.isEventKey(evt, 'enter')) {
            start();
          }
        }}
      />
      <div key="options" className={classes.optionSection}>
        <div className={classes.leftOption}>
          <FormControl component="fieldset">
            <FormLabel component="legend">选项</FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={doTranslate}
                  onChange={(evt, checked) => {
                    changeDoTranslate(!!checked);
                  }}
                />
              }
              label="翻译"
            />
          </FormControl>
        </div>
        <div className={classes.rightOption}>
          <Button
            variant="contained"
            color="primary"
            onClick={start}
            disabled={loaderState.loading}
            classes={{
            }}
          >
            {
              loaderState.loading ?
                '获取中……' :
                '转换（回车）'
            }
          </Button>
        </div>
      </div>
      {loaderState.error && (
        <div key="error" className={classes.errorSection} >
          {loaderState.error.toString()}
        </div>
      )}
      <TextField
        key="transformed"
        inputProps={{
          ref: transformedRef,
          className: classes.textFieldTransformedInput,
        }}
        readOnly
        variant="outlined"
        multiline
        fullWidth
        className={classes.textFieldTransformed}
        label="转换后"
        placeholder="这里将显示转换后的文字"
        value={transformedValue}
      />
    </Grid>
  );
}

_FormBody.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string).isRequired,
};

const FormBody = withStyles(formBodyClasses)(_FormBody);

function _Form({ classes }) {
  return (
    <Grid container className={classes.body}>
      <FormBody />
      <div className={classes.description}>
        <Typography variant="title" gutterBottom>
          说明
        </Typography>
        <Typography>
          本工具获取目标地址的《风暴英雄》更新日志，并将其转换为 bbs.nga.com 能使用的论坛代码的形式。
        </Typography>
      </div>
    </Grid>
  );
}

const formClasses = {
  body: {
    maxWidth: 768,
    margin: 'auto',
    marginTop: 20,
  },

  description: {
    maxWidth: 512,
    margin: 'auto',
    marginTop: 30,
    padding: 20,
    border: '1px solid #eee',
  },
};

export default withStyles(formClasses)(_Form);
