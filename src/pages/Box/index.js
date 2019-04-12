import React, { Component } from "react";
import AsyncStorage from "@react-native-community/async-storage";
import ImagePicker from "react-native-image-picker";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ToastAndroid
} from "react-native";
import RNFS from "react-native-fs";
import FileViewer from "react-native-file-viewer";
import socket from "socket.io-client";

import { distanceInWords } from "date-fns";
import pt from "date-fns/locale/pt";

import api from "../../services/api";

import styles from "./styles";

import Icon from "react-native-vector-icons/MaterialIcons";

export default class Box extends Component {
    state = {
        box: {}
    };

    async componentDidMount() {
        this.subscribeToNewFiles();

        const box = await AsyncStorage.getItem("@RocketBox:box");

        this.subscribeToNewFiles(box);
        const response = await api.get(`/boxes/${box}`);

        this.setState({ box: response.data });
    }

    subscribeToNewFiles = box => {
        const io = socket("https://omnistack-backend-erik.herokuapp.com");

        io.emit("connectRoom", box);

        io.on("file", data => {
            this.setState({
                box: {
                    ...this.state.box,
                    files: [data, ...this.state.box.files]
                }
            });
        });
    };

    openFile = async file => {
        try {
            const filePath = `${RNFS.DocumentDirectoryPath}/${file.title}`;
            await RNFS.downloadFile({
                fromUrl: file.url,
                toFile: filePath
            });

            await FileViewer.open(filePath);
        } catch (error) {
            ToastAndroid.show("Arquivo não suportado", 2000);
        }
    };

    renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => this.openFile(item)}
            style={styles.file}
        >
            <View style={styles.fileInfo}>
                <Icon name="insert-drive-file" size={24} color="#A5CFFF" />
                <Text style={styles.fileTitle}>{item.title}</Text>
                <Text style={styles.fileDate}>
                    {item.title} há{" "}
                    {distanceInWords(item.createdAt, new Date(), {
                        locale: pt
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    handleUpload = () => {
        ImagePicker.launchImageLibrary({}, async upload => {
            if (upload.error) {
                console.log("ImagePicker error");
            } else if (upload.didCancel) {
                console.log("Canled by user");
            } else {
                const data = new FormData();
                const [prefix, sufix] = upload.fileName.split(".");
                const ext = sufix.toLowerCase() === "heic" ? "jpg" : sufix;
                data.append("file", {
                    uri: upload.uri,
                    type: upload.type,
                    name: `${prefix}.${ext}`
                });

                await api.post(`/boxes/${this.state.box._id}/files`, data);
            }
        });
    };

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.boxTitle}>{this.state.box.title}</Text>
                <FlatList
                    data={this.state.box.files}
                    style={styles.list}
                    keyExtractor={file => file._id}
                    ItemSeparatorComponent={() => (
                        <View style={styles.separator} />
                    )}
                    renderItem={this.renderItem}
                />

                <TouchableOpacity
                    style={styles.fab}
                    onPress={this.handleUpload}
                >
                    <Icon name="cloud-upload" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }
}
