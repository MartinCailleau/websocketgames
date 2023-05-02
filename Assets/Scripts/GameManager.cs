using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager instance;
    public List<GameObject> spawnedObjects;

    public Canvas scoreCanvas;
    public GameObject playerScorePrefab;

    public List<ScoreData> scoreList;
    // Start is called before the first frame update
    void Start()
    {
        if (instance == null)
        {
            instance = this;
        }
        else
        {
            Destroy(this);
        }
        
        spawnedObjects = new List<GameObject>();
        scoreList = new List<ScoreData>();
        InvokeRepeating("sortScore", 0, 2);
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    void sortScore()
    {
        ScoreData[] sortedScoreList = scoreList.ToArray();
        
        int max = 0;
        for (int i = 0; i < scoreList.Count-1; i++)
        {
            max = i;
            for (int j = i+1; j < scoreList.Count; j++)
            {
                if (sortedScoreList[j].score > sortedScoreList[max].score)
                {
                    max = j;
                }
                
            }

            ScoreData tmp = sortedScoreList[i];
            sortedScoreList[i] = sortedScoreList[max];
            sortedScoreList[max] = tmp;
        }

        for (int i = 0; i < sortedScoreList.Length; i++)
        {
            Debug.Log(i+" - "+sortedScoreList[i].score);
            sortedScoreList[i].GetComponent<RectTransform>().position = new Vector3((200*(i+1)),1080-150,0);
        }
        
        
        
    }
    
    
}
