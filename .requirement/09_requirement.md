1. The user will upload the Excel (.xlx/xlsx/.csv) file in the Preprocess section.

2. The Excel file then needs to be stored as a global file as all the upcoming operation needs to be performed on this user input.

3. The first operation of data preprocessing is to show the missing values in the missing section of the Preprocess page. 
The missing section includes the variable name(or the field name from the input file), variable type, missing count, and handle strategy. 
On selecting the appropriate strategy for all the columns, the user clicks on the Preprocess button, **which will pop up a message that " Missing values are handled successfully**."

4. Next operation on the same page in the Encoding, where the fields (from the input file ) that are of data type: object/string need to be listed. 
And the user has the ability to select the desired field and add it to the encoding table. The encoding table will show the variable name, unique values 
in that field, and the handling strategy (label encoding/ One-hot encoding). And then the user clicks on the preprocess button. 
which **will pop up a message that " Encoding fields are handled successfully**."

5. Feature selection: Users have to select the method for feature selection and on clicking the preprocess button, it will give the score of the features 
individually with the target value. The same score to appear in the frontend for users knowledge.-Done(Backend working/Frontend will show)

6. Data Split: Users have to select the ratio(70-30/80-20) and the random state they want to apply the train-test split function. 
On clicking, the backend will apply this function and split the entire already preprocessed file into 4 new CSV files.
The user will click on the download button and then download the preprocessed 4 csv files

7. Data Visualization: The user have to upload the input file of format (.xlx/xlsx/.csv).User will select the fields from the auto-populated drop-down list of the available fields
 to choose the X-axis and Y-axis. Once that is done, by deafult the chart type selected in bar chart that will get generate and that will appear in the chart preview.
 User on clicking the button " Export to PPT" will able to download the visual in the ppt format.
 
8. Image Labelling- User will select the image they want to label. and click on the "Upload image button". So one by one the image will appear in the image preview section and the 
object deetction with the bounding box will appear around the boxes. A drop-down to select the object label will appear with the confidence ercentage mention. So, user have to select the desried 
label and click on the next button. Once done, the user have to click on the "Exportr YAML File" button that will generate the .yaml file.