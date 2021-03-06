import React, { Component } from 'react';
import Markdown from 'markdown-to-jsx'
import AceEditor from 'react-ace';
import styled from 'styled-components';
import dateFns from 'date-fns';
import brace from 'brace';
import 'brace/mode/markdown';
import 'brace/theme/dracula';

import './App.css';

const settings = window.require('electron-settings');
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');

const formatDate = (date) => dateFns.format(new Date(date), 'MMMM Do YYYY');
class App extends Component {
  state = { 
    loadedFile: '',
    directory: settings.get('directory') || null,
    activeIndex: 0,
    newEntry: false,
    newEntryName: '',
    filesData: []
  };

  constructor() {
    super();

    this.changeValue = this.changeValue.bind(this);

    const directory = settings.get('directory');
    if (directory) {
      this.loadAndReadFiles(directory);
    }

    ipcRenderer.on('new-dir', (event, directory) => {
      this.setState({
        directory
      });
      
      settings.set('directory', directory);
      this.loadAndReadFiles(directory);
    });

    ipcRenderer.on('save-file', (event) => {
      this.saveFile();
    });
  }

  loadAndReadFiles = (directory) => {
    fs.readdir(directory, (err, files) => {
      const filteredFiles = files.filter( file => file.endsWith('.md'))
      const filesData = filteredFiles.map( file => {
        const fileName = file.split('.md')[0];
        return {
          date: fileName.split('_')[1],
          path: `${directory}/${file}`,
          title: fileName.split('_')[0],
          key: fileName.replace(' ','-')
        };
      });

      filesData.sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return bTime - aTime;
      });

      this.setState(
        { filesData }, 
        () => this.loadFile(0)
      );
    });
  }

  changeFile = (index) => () => {
    const { activeIndex } = this.state;

    if (index !== activeIndex) {
      this.saveFile();
      this.loadFile(index);
    }
  }

  loadFile = (index) => {
    const { filesData } = this.state;

    const content = fs.readFileSync(filesData[index].path).toString();

    this.setState({
      activeIndex: index,
      loadedFile: content
    });
  }

  saveFile = () => {
    const { activeIndex, loadedFile, filesData } = this.state;

    fs.writeFile(filesData[activeIndex].path, loadedFile, (err) => {
      if (err) console.log(err);
      console.log('saved');
    });
  }

  changeValue(e) {
    const { name, value } = e.target;
    this.setState({
      [name]: value
    });
  }

  createFile = (e) => {
    e.preventDefault();
    const { directory, newEntryName, filesData } = this.state;
    const fileDate = dateFns.format(new Date(), 'MM-DD-YY');
    const fileName = `${newEntryName}_${fileDate}`;
    const filePath = `${directory}/${fileName}.md`;

    fs.writeFile(filePath, '', (err) => {
      if (err) return console.log('err: ', err);

      filesData.unshift({
        path: filePath,
        date: fileDate,
        title: newEntryName,
        key: fileName.replace(' ','-')
      });
      
      this.setState({
        newEntry: false,
        newEntryName: '',
        loadedFile: '',
        activeIndex: 0,
        filesData
      });

    });
  }

  render() {
    const { 
      activeIndex,
      loadedFile,
      directory,
      filesData,
      newEntry,
      newEntryName
    } = this.state;

    return (
      <AppWrap>
        <Header>Journal</Header>
        {directory ? (
          <Split>
            <FilesWindow>
              <Button
                onClick={() => {this.setState({ newEntry: !newEntry })}}
              >
                + New Entry
              </Button>
              {newEntry &&
                <form onSubmit={this.createFile}>
                  <input
                    name="newEntryName"
                    type="text"
                    autoFocus
                    value={newEntryName}
                    onChange={this.changeValue}
                  />
                </form>
              }
              {filesData.map((file, index) => (
                <FileButton
                  key={file.key}
                  active={activeIndex === index}
                  onClick={this.changeFile(index)}>
                   <p className="title">{file.title}</p>
                   <p className="date">{formatDate(file.date)}</p>
                </FileButton>
              ))}
            </FilesWindow>
            <CodeWindow>
              <AceEditor
                mode="markdown"
                theme="dracula"
                onChange={(newContent) => {
                  this.setState({ loadedFile: newContent });
                }}
                name="md-editor"
                value={loadedFile}
              />
            </CodeWindow>
            <RenderedWindow>
              <Markdown>{loadedFile}</Markdown>
            </RenderedWindow>
          </Split>
        ) : (
          <LoadingMessage>
            <h1>Press Cmd/Ctrl + O to open directory.</h1>
          </LoadingMessage>
        )
        }
      </AppWrap>
    );
  }
}

export default App;

const Header = styled.div`
  background-color: #191324;
  color: #75717c;
  font-size: 0.8rem;
  height: 23px;
  text-align: center;
  position: fixed;
  box-shadow: 0 3px 3px rgba(0, 0, 0, 0.2);
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  -webkit-app-region: drag;
`;

const AppWrap = styled.div`
  margin-top: 23px;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: #FFFFFF;
  background-color: #191324;
  height: 100vh;
`;

const Split = styled.div`
  display: flex;
  height: 100vh;
`;

const FilesWindow = styled.div`
  background-color: #140F1D;
  border-right: 1px solid #302B3A;
  position: relative;
  width: 20%;
  &:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    top: 0;
    pointer-events: none;
    box-shadow: -10px 0 20px rgba(0,0,0, 0.3) inset;
  }
`;

const CodeWindow = styled.div`
  flex: 1;
  padding-top: 2rem;
  background-color: #191324;
`;

const RenderedWindow = styled.div`
  background-color: #191324;
  width: 35%;
  padding: 20px;
  color: #FFF;
  border-left: 1px solid #302b3a
  
  h1, h2, h3, h4, h5, h6 {
    color: #82d8d8;
  }

  h1 {
    border-bottom: 3px solid #E54B4B;
    padding-bottom: 10px;
  }

  a {
    color: #E54B4B;
  }
`;

const FileButton = styled.button`
  padding: 10px;
  width: 100%;
  background: #191224;
  opacity: 0.4;
  color: white;
  border: none;
  border-bottom: 1px solid #302b3a;
  transition: 0.3s ease all;
  outline: none;
  text-align: left;
  &:hover {
    opacity: 1;
    border-left: 4px solid #82d8d8;
  }
  ${({active}) => active && `
    opacity: 1;
    border-left: 4px solid #82d8d8;
  `}

  .title {
    font-size: 0.9rem;
    font-weight: bold;
    margin: 0 0 5px;
  }
  .date {
    margin: 0;
  }
`;

const Button = styled.button`
  background: transparent;
  color: #FFFFFF;
  border: 1px solid #82d8d8;
  border-radius: 4px;
  display: block;
  margin: 1rem auto;
  font-size: 1rem;
  transition: 0.3s ease all;
  padding: 5px 10px;
  &:hover {
    background: #82d8d8;
    color: #191324;
  }
`;